import os
import json
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from pydantic import BaseModel
from typing import Dict, Any, List, TypedDict
from langgraph.graph import StateGraph, END

from tools import get_stock_data, generate_stock_response

# Load environment variables from .env file
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Get configuration from environment variables
google_api_key = os.getenv("GOOGLE_API_KEY")
gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not google_api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please set it in a .env file or directly in your environment.")

# Initialize the Gemini model
llm = ChatGoogleGenerativeAI(model=gemini_model, google_api_key=google_api_key)


# Define the AgentState
class AgentState(TypedDict):
    query: str
    ticker: str | None
    stock_data: Dict[str, Any] | None
    final_response: str | None


# LangGraph Nodes
async def extract_ticker_node(state: AgentState) -> AgentState:
    print("---EXTRACTING TICKER---")
    query = state["query"]
    
    prompt_template = f"""
    You are an expert at parsing financial requests. Extract the stock ticker symbol from the following user query. Respond with *only* the uppercase ticker symbol. If no ticker is found, respond with "NONE".

    User Query: "{query}"
    """

    messages = [
        SystemMessage(content="You are an expert at parsing financial requests. Extract the stock ticker symbol from the following user query. Respond with *only* the uppercase ticker symbol. If no ticker is found, respond with \"NONE\"."),
        HumanMessage(content=f"User Query: \"{query}\"")
    ]
    
    response = await llm.ainvoke(messages)
    ticker = response.content.strip().upper()

    if ticker == "NONE":
        return {"ticker": None}
    else:
        return {"ticker": ticker}

async def fetch_and_analyze_node(state: AgentState) -> AgentState:
    print("---FETCHING AND ANALYZING STOCK DATA---")
    ticker = state["ticker"]
    if not ticker:
        return {"stock_data": None, "final_response": "I couldn't identify a stock ticker in your message. Please provide a valid ticker symbol like 'AAPL' or 'MSFT'."}

    # Fetch real-time stock data
    stock_data = get_stock_data(ticker)
    if not stock_data:
        return {"stock_data": None, "final_response": f"I couldn't fetch data for {ticker}. Please check the ticker symbol and try again."}

    # Generate structured response with reasoning
    query = state["query"]
    response_data = await generate_stock_response(stock_data, query, llm)

    return {"stock_data": stock_data, "final_response": response_data}

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
workflow.add_node("fetch_and_analyze", fetch_and_analyze_node)
workflow.add_node("handle_no_ticker", handle_no_ticker_node)

# Set entry point
workflow.set_entry_point("extract_ticker")

# Add edges
workflow.add_conditional_edges(
    "extract_ticker",
    lambda state: "ticker_found" if state["ticker"] else "no_ticker",
    {
        "ticker_found": "fetch_and_analyze",
        "no_ticker": "handle_no_ticker",
    },
)
workflow.add_edge("fetch_and_analyze", END)
workflow.add_edge("handle_no_ticker", END)

# Compile the graph
app_graph = workflow.compile()


class ChatRequest(BaseModel):
    message: str

@app.get("/")
async def read_root():
    return {"message": "Welcome to the FastAPI LangChain Gemini Stock Server!"}

@app.post("/chat")
async def chat_with_gemini(request: ChatRequest):
    try:
        # Initial state for the graph
        initial_state = {"query": request.message, "ticker": None, "stock_data": None, "final_response": None}
        
        # Run the graph
        # We iterate to get the final state after all nodes have run
        final_state = None
        async for s in app_graph.astream(initial_state):
            print(s)
            # Extract the actual state from the streamed result
            if s:  # s is a dict like {'node_name': state}
                final_state = list(s.values())[0]  # Get the state from the first (and only) value

        if final_state and final_state.get("final_response"):
            return {"response": final_state["final_response"]}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate a response from the stock agent.")

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))
