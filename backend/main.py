import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from pydantic import BaseModel
from typing import Dict, Any, List, TypedDict, Optional, Union
from langgraph.graph import StateGraph, END
from langfuse import Langfuse

from tools import get_stock_data, generate_stock_response, get_monthly_stock_data
from database import create_tables, get_db, create_chat, add_message_to_chat, get_chat_history, get_all_chats, update_chat_title

# Load environment variables from .env file
load_dotenv()

# Create database tables
create_tables()

# Initialize FastAPI app
app = FastAPI()

# Get configuration from environment variables
google_api_key = os.getenv("GOOGLE_API_KEY")
gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not google_api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please set it in a .env file or directly in your environment.")

# Initialize Langfuse client for tracing
langfuse_client = None
try:
    langfuse_public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    langfuse_secret_key = os.getenv("LANGFUSE_SECRET_KEY")
    langfuse_base_url = os.getenv("LANGFUSE_BASE_URL", "https://cloud.langfuse.com")
    
    if langfuse_public_key and langfuse_secret_key:
        langfuse_client = Langfuse(
            public_key=langfuse_public_key,
            secret_key=langfuse_secret_key,
            host=langfuse_base_url
        )
        print("✓ Langfuse tracing initialized successfully")
    else:
        print("⚠ Langfuse credentials not found - tracing disabled")
except Exception as e:
    print(f"⚠ Langfuse initialization failed: {e} - tracing disabled")
    langfuse_client = None

# Initialize the Gemini model
llm = ChatGoogleGenerativeAI(model=gemini_model, google_api_key=google_api_key)


# Define the AgentState
class AgentState(TypedDict):
    query: str
    tickers: List[str] | None
    stock_data: Dict[str, Any] | None
    final_response: List[Dict[str, Any]] | Dict[str, Any] | None


# LangGraph Nodes
async def extract_ticker_node(state: AgentState) -> AgentState:
    print("---EXTRACTING TICKERS---")
    query = state["query"]
    
    prompt = f"""
    You are an expert at parsing financial requests. Extract ALL stock ticker symbols from the following user query.

    Rules:
    - Look for common stock tickers (1-5 characters, uppercase)
    - Common examples: AAPL, MSFT, GOOGL, TSLA, AMZN, NVDA, etc.
    - If multiple tickers are mentioned, list them all
    - Respond with ONLY a comma-separated list of uppercase tickers
    - If no tickers are found, respond with "NONE"

    Examples:
    Query: "How is AAPL doing?" → AAPL
    Query: "Compare MSFT and GOOGL" → MSFT,GOOGL
    Query: "What about TSLA stock?" → TSLA

    User Query: "{query}"
    """

    messages = [
        SystemMessage(content=prompt),
        HumanMessage(content=f"User Query: \"{query}\"")
    ]
    
    response = await llm.ainvoke(messages)
    content = response.content.strip().upper()

    if content == "NONE" or not content:
        return {"tickers": None}
    else:
        # Split by comma and clean up
        tickers = [ticker.strip() for ticker in content.split(',') if ticker.strip()]
        return {"tickers": tickers}

async def process_multiple_stocks_node(state: AgentState) -> AgentState:
    print("---PROCESSING MULTIPLE STOCKS---")
    tickers = state["tickers"]
    query = state["query"]

    if not tickers:
        return {"stock_data": None, "final_response": "I couldn't identify any stock tickers in your message. Please provide valid ticker symbols like 'AAPL' or 'MSFT'."}

    responses = []

    for ticker in tickers:
        print(f"---PROCESSING {ticker}---")

        # Fetch real-time stock data
        stock_data = get_stock_data(ticker)
        if not stock_data:
            # Create error response for this ticker
            responses.append({
                "message": f"I couldn't fetch data for {ticker}. Please check the ticker symbol and try again.",
                "price": None,
                "changePercent": None,
                "monthlyData": None
            })
            continue

        # Generate structured response with reasoning
        response_data = await generate_stock_response(stock_data, query, llm)
        responses.append(response_data)

    return {"stock_data": None, "final_response": responses}

async def handle_stock_comparison_node(state: AgentState) -> AgentState:
    print("---HANDLING STOCK COMPARISON---")
    tickers = state["tickers"]
    query = state["query"]

    if not tickers or len(tickers) < 2:
        return {"final_response": {
            "message": "I need at least 2 stock tickers to create a comparison. Please provide multiple ticker symbols.",
            "price": None,
            "changePercent": None,
            "monthlyData": None
        }}

    # Fetch data for all tickers (removed 5 ticker limit)
    comparison_data = []
    valid_tickers = []

    for ticker in tickers[:10]:  # Increased limit to 10 tickers
        stock_data = get_stock_data(ticker)
        monthly_data = get_monthly_stock_data(ticker)
        if stock_data and monthly_data and len(monthly_data.get('data', [])) > 0:
            valid_tickers.append(ticker)
            comparison_data.append({
                "ticker": ticker,
                "currentPrice": stock_data.get('currentPrice', 0),
                "dailyChangePercent": stock_data.get('dailyChangePercent', 0),
                "monthlyData": monthly_data['data']
            })

    if len(valid_tickers) < 2:
        return {"final_response": {
            "message": "I couldn't fetch data for enough tickers to create a comparison. Please try different ticker symbols.",
            "price": None,
            "changePercent": None,
            "monthlyData": None
        }}

    # Generate comparison response
    ticker_list = ", ".join(valid_tickers)
    message = f"I've created a comparison chart for {ticker_list}. You can toggle individual stocks on/off using the controls below the chart."

    return {"final_response": {
        "message": message,
        "price": None,
        "changePercent": None,
        "monthlyData": None,
        "comparisonData": comparison_data
    }}

async def handle_general_finance_node(state: AgentState) -> AgentState:
    print("---HANDLING GENERAL FINANCE QUESTION---")
    query = state["query"]

    # System prompt to keep responses within finance domain
    system_prompt = """You are Stock Stalk, a friendly AI Finance Agent who helps users with financial questions, market insights, and investment education.

IMPORTANT GUIDELINES:
- Always stay within finance, investing, markets, and economic topics
- Be conversational, friendly, and engaging - like a knowledgeable financial advisor friend
- For greetings (hi, hello, etc.): Respond warmly and naturally, then gently steer toward finance topics
- If asked about non-finance topics, politely redirect back to finance with a smooth transition
- Provide accurate information and remind users to do their own research
- Keep responses informative but not overwhelming
- Use natural, conversational language
- NEVER use emojis, special characters, or Unicode symbols in your responses
- IMPORTANT: Do NOT always start with greetings - respond naturally based on context

Examples of good responses:
- To "Hi!": "Hello! Great to meet you. I'm Stock Stalk, your AI finance companion. What financial topics are you interested in today?"
- To "How are you?": "I'm doing great, thanks for asking! Always excited to help with financial questions. What's on your mind today?"
- To "Can you give me a list of known ticker symbols?": "I'd be happy to help with some popular ticker symbols! Here are some well-known ones: AAPL (Apple), MSFT (Microsoft), GOOGL (Alphabet), AMZN (Amazon), TSLA (Tesla), NVDA (Nvidia), and META (Meta Platforms). These are some of the largest and most actively traded companies. What specific sector or type of company are you interested in?"
- To general questions: Provide direct, helpful answers without forced greetings

Respond naturally while staying within these finance guidelines and avoiding all emojis and special characters."""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=query)
    ]
    
    try:
        response = await llm.ainvoke(messages)
        message_content = response.content
    except Exception as e:
        print(f"Error generating general finance response: {e}")
        # Fallback response
        if "list of known ticker symbols" in query.lower() or "ticker symbols" in query.lower():
            message_content = "I'd be happy to help with some popular ticker symbols! Here are some well-known ones: AAPL (Apple), MSFT (Microsoft), GOOGL (Alphabet), AMZN (Amazon), TSLA (Tesla), NVDA (Nvidia), and META (Meta Platforms). These are some of the largest and most actively traded companies. What specific sector or type of company are you interested in?"
        else:
            message_content = "I'm here to help with your financial questions! What finance or investment topics are you interested in learning about?"

    return {"final_response": {
        "message": message_content,
        "price": None,
        "changePercent": None,
        "monthlyData": None
    }}

async def handle_no_ticker_node(state: AgentState) -> AgentState:
    print("---HANDLING NO TICKER---")
    return {"final_response": {
        "message": "I couldn't find a stock ticker in your request. Please provide a valid ticker symbol, like 'AAPL' or 'MSFT'.",
        "price": None,
        "changePercent": None,
        "monthlyData": None
    }}

# Define the LangGraph workflow
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("extract_ticker", extract_ticker_node)
workflow.add_node("process_multiple_stocks", process_multiple_stocks_node)
workflow.add_node("handle_stock_comparison", handle_stock_comparison_node)
workflow.add_node("handle_general_finance", handle_general_finance_node)
workflow.add_node("handle_no_ticker", handle_no_ticker_node)

# Set entry point
workflow.set_entry_point("extract_ticker")

# Add edges
workflow.add_conditional_edges(
    "extract_ticker",
    lambda state: (
        "stock_comparison" if (
            state["tickers"] and len(state["tickers"]) >= 2 and
            any(word in state["query"].lower() for word in [
                'compare', 'comparison', 'comparing', 'vs', 'versus', 'versus', 'against',
                'chart', 'graph', 'plot', 'visualize', 'show me', 'display'
            ])
        ) else (
            "tickers_found" if state["tickers"] else (
                "general_finance" if any(keyword in state["query"].lower() for keyword in [
                    'stock', 'market', 'invest', 'finance', 'trading', 'economy', 'bond', 'etf', 'mutual fund',
                    'portfolio', 'dividend', 'earnings', 'ipo', 'crypto', 'bitcoin', 'forex', 'currency',
                    'interest rate', 'inflation', 'recession', 'bull market', 'bear market', 'volatility',
                    'risk', 'return', 'p/e ratio', 'dividend yield', 'market cap', 'valuation', 'technical analysis',
                    'fundamental analysis', 'options', 'futures', 'commodities', 'gold', 'oil', 'real estate',
                    'retirement', '401k', 'ira', 'tax', 'capital gains', 'broker', 'trading platform',
                    'how to invest', 'investment strategy', 'financial planning', 'wealth management',
                    'passive income', 'side hustle', 'financial freedom', 'money management',
                    'ticker', 'symbol', 'symbols', 'list', 'known', 'popular', 'famous', 'biggest', 'largest'
                ]) or any(indicator in state["query"].lower() for indicator in [
                    'what is', 'how does', 'explain', 'tell me about', 'what does', 'why do', 'how do',
                    'what are', 'how to', 'what should', 'advice', 'recommend', 'opinion', 'thoughts',
                    'can you', 'could you', 'would you', 'give me', 'show me', 'tell me',
                    'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'how are you',
                    'what\'s up', 'how\'s it going', 'nice to meet you', 'thanks', 'thank you', 'bye', 'goodbye'
                ]) else "no_ticker"
            )
        )
    ),
    {
        "stock_comparison": "handle_stock_comparison",
        "tickers_found": "process_multiple_stocks",
        "general_finance": "handle_general_finance",
        "no_ticker": "handle_no_ticker",
    },
)

workflow.add_edge("process_multiple_stocks", END)
workflow.add_edge("handle_stock_comparison", END)
workflow.add_edge("handle_general_finance", END)
workflow.add_edge("handle_no_ticker", END)

# Compile the graph
app_graph = workflow.compile()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None

@app.get("/")
async def read_root():
    return {"message": "Welcome to the FastAPI LangChain Gemini Stock Server!"}

@app.post("/chat")
async def chat_with_gemini(request: ChatRequest):
    # Create Langfuse trace for this chat session
    trace = None
    if langfuse_client:
        trace = langfuse_client.trace(
            name="stock-chat",
            input={"message": request.message, "session_id": request.session_id},
            user_id=str(request.session_id) if request.session_id else "new_session"
        )
    
    try:
        # Get database session
        db = next(get_db())

        # Create or get existing chat session
        if request.session_id:
            # Use existing session
            chat_id = request.session_id
        else:
            # Create new chat session with auto-generated title from first message
            title = request.message[:50] + "..." if len(request.message) > 50 else request.message
            chat = create_chat(db, title)
            chat_id = chat.id

        # Save user message to database
        add_message_to_chat(db, chat_id, "user", request.message)

        # Initial state for the graph
        initial_state = {"query": request.message, "tickers": None, "stock_data": None, "final_response": None}
        
        # Run the graph
        # We iterate to get the final state after all nodes have run
        final_state = None
        async for s in app_graph.astream(initial_state):
            print(s)
            # Extract the actual state from the streamed result
            if s:  # s is a dict like {'node_name': state}
                final_state = list(s.values())[0]  # Get the state from the first (and only) value

        if final_state and final_state.get("final_response"):
            response_data = final_state["final_response"]

            # Handle multiple responses (list) vs single response (dict)
            if isinstance(response_data, list):
                # Multiple stock responses - save each as a separate message
                for i, single_response in enumerate(response_data):
                    add_message_to_chat(
                        db,
                        chat_id,
                        "assistant",
                        single_response.get("message", ""),
                        price=str(single_response.get("price")) if single_response.get("price") else None,
                        change_percent=str(single_response.get("changePercent")) if single_response.get("changePercent") else None,
                        monthly_data=json.dumps(single_response.get("monthlyData")) if single_response.get("monthlyData") else None,
                        comparison_data=json.dumps(single_response.get("comparisonData")) if single_response.get("comparisonData") else None
                    )
                return {"response": response_data, "session_id": chat_id}
            else:
                # Single response
                add_message_to_chat(
                    db,
                    chat_id,
                    "assistant",
                    response_data.get("message", ""),
                    price=str(response_data.get("price")) if response_data.get("price") else None,
                    change_percent=str(response_data.get("changePercent")) if response_data.get("changePercent") else None,
                    monthly_data=json.dumps(response_data.get("monthlyData")) if response_data.get("monthlyData") else None,
                    comparison_data=json.dumps(response_data.get("comparisonData")) if response_data.get("comparisonData") else None
                )
                
                # Update Langfuse trace with output
                if trace:
                    trace.update(output={"response": "success", "session_id": chat_id})
                    langfuse_client.flush()
                
                return {"response": response_data, "session_id": chat_id}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate a response from the stock agent.")

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        # Update trace with error
        if trace:
            trace.update(output={"error": str(e)})
            langfuse_client.flush()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chats")
async def get_chats():
    """Get all chat sessions"""
    try:
        db = next(get_db())
        chats = get_all_chats(db)
        return {"chats": [{"id": chat.id, "title": chat.title, "created_at": chat.created_at, "updated_at": chat.updated_at} for chat in chats]}
    except Exception as e:
        print(f"Error getting chats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat/{chat_id}")
async def get_chat_messages(chat_id: int):
    """Get all messages for a specific chat"""
    try:
        db = next(get_db())
        messages = get_chat_history(db, chat_id)
        chat_messages = []
        for msg in messages:
            message_data = {
                "id": msg.id,
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.created_at,
            }

            # Add stock data if available
            if msg.price:
                try:
                    message_data["price"] = float(msg.price)
                except:
                    pass
            if msg.change_percent:
                try:
                    message_data["changePercent"] = float(msg.change_percent)
                except:
                    pass
            if msg.monthly_data:
                try:
                    message_data["monthlyData"] = json.loads(msg.monthly_data)
                except:
                    pass
            if msg.comparison_data:
                try:
                    message_data["comparisonData"] = json.loads(msg.comparison_data)
                except:
                    pass

            chat_messages.append(message_data)

        return {"messages": chat_messages}
    except Exception as e:
        print(f"Error getting chat messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/chat/{chat_id}")
async def delete_chat(chat_id: int):
    """Delete a chat session"""
    try:
        from database import Chat
        db = next(get_db())
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if chat:
            db.delete(chat)
            db.commit()
            return {"message": "Chat deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Chat not found")
    except Exception as e:
        print(f"Error deleting chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-langfuse")
async def test_langfuse():
    """
    Simple test endpoint to verify Langfuse integration.
    Sends a 'Hello' message to the LLM and traces it in Langfuse.
    """
    try:
        if not langfuse_client:
            return {
                "status": "warning",
                "message": "Langfuse is not configured. Please set LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY in your .env file.",
                "traced": False
            }
        
        # Create a trace for this test
        trace = langfuse_client.trace(
            name="langfuse-test",
            input={"test_message": "Hello"},
            user_id="test_user",
            metadata={"purpose": "Langfuse integration test"}
        )
        
        # Create a generation span within the trace
        generation = trace.generation(
            name="test-llm-call",
            model=gemini_model,
            input=[
                {"role": "system", "content": "You are a helpful assistant. Keep responses brief."},
                {"role": "user", "content": "Hello! Just say 'Hello from Stock Stalk!' in a friendly way."}
            ]
        )
        
        # Send a simple message to the LLM
        messages = [
            SystemMessage(content="You are a helpful assistant. Keep responses brief."),
            HumanMessage(content="Hello! Just say 'Hello from Stock Stalk!' in a friendly way.")
        ]
        
        response = await llm.ainvoke(messages)
        
        # Update the generation with the output
        generation.end(output=response.content)
        
        # Update trace with success
        trace.update(output={"llm_response": response.content})
        
        # Flush to ensure trace is sent to Langfuse
        langfuse_client.flush()
        
        return {
            "status": "success",
            "message": "Langfuse test completed! Check your Langfuse dashboard.",
            "llm_response": response.content,
            "traced": True,
            "instructions": "Go to your Langfuse dashboard at https://cloud.langfuse.com to see the trace named 'langfuse-test'"
        }
    
    except Exception as e:
        return {
            "status": "error",
            "message": f"Langfuse test failed: {str(e)}",
            "traced": False
        }
