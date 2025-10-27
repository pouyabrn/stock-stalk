import yfinance as yf
import json
import os
from typing import Dict, Any, List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from datetime import datetime, timedelta

def get_stock_data(ticker_symbol: str) -> Dict[str, Any] | None:
    """
    Fetches real-time stock data focused on current price and 24h performance.
    """
    try:
        ticker = yf.Ticker(ticker_symbol)

        # Get basic info
        info = ticker.info
        company_name = info.get('longName', ticker_symbol.upper())
        current_price = info.get('currentPrice', info.get('regularMarketPrice'))
        previous_close = info.get('previousClose')

        # Get 24h historical data for price changes
        historical_days = int(os.getenv("HISTORICAL_DATA_DAYS", "2"))
        historical_interval = os.getenv("HISTORICAL_INTERVAL", "1h")

        end_date = datetime.now()
        start_date = end_date - timedelta(days=historical_days)  # Configurable days for historical data

        hist_data = ticker.history(start=start_date, end=end_date, interval=historical_interval)

        # Calculate 24h change
        if len(hist_data) >= 24:  # Ensure we have enough data points
            # Get price 24 hours ago
            price_24h_ago = hist_data.iloc[-24]['Close'] if len(hist_data) >= 24 else hist_data.iloc[0]['Close']
            price_change_24h = current_price - price_24h_ago if current_price and price_24h_ago else 0
            price_change_percent_24h = (price_change_24h / price_24h_ago) * 100 if price_24h_ago and price_24h_ago != 0 else 0

            # Get daily high/low in last 24h
            last_24h_data = hist_data.tail(24)
            high_24h = last_24h_data['High'].max()
            low_24h = last_24h_data['Low'].min()
        else:
            price_change_24h = 0
            price_change_percent_24h = 0
            high_24h = current_price
            low_24h = current_price

        # Calculate daily change (from previous close)
        daily_change = current_price - previous_close if current_price and previous_close else 0
        daily_change_percent = (daily_change / previous_close) * 100 if previous_close and previous_close != 0 else 0

        return {
            "ticker": ticker_symbol.upper(),
            "companyName": company_name,
            "currentPrice": current_price,
            "previousClose": previous_close,
            "dailyChange": round(daily_change, 2),
            "dailyChangePercent": round(daily_change_percent, 2),
            "price24hAgo": round(price_24h_ago, 2) if 'price_24h_ago' in locals() else None,
            "change24h": round(price_change_24h, 2),
            "changePercent24h": round(price_change_percent_24h, 2),
            "high24h": round(high_24h, 2),
            "low24h": round(low_24h, 2),
            "volume": info.get('volume', 0),
            "marketCap": info.get('marketCap'),
            "sector": info.get('sector'),
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        print(f"Error fetching data for {ticker_symbol}: {e}")
        return None

def analyze_price_movement(stock_data: Dict[str, Any]) -> str:
    """
    Analyzes price movement and provides reasoning about what's happening.
    """
    if not stock_data or not stock_data.get('currentPrice'):
        return "Unable to analyze price movement due to missing data."

    current_price = stock_data['currentPrice']
    daily_change = stock_data.get('dailyChange', 0)
    daily_change_percent = stock_data.get('dailyChangePercent', 0)
    change_24h = stock_data.get('change24h', 0)
    change_percent_24h = stock_data.get('changePercent24h', 0)
    high_24h = stock_data.get('high24h', current_price)
    low_24h = stock_data.get('low24h', current_price)

    # Determine trend
    if daily_change > 0:
        trend = "up"
        direction = "gained"
    elif daily_change < 0:
        trend = "down"
        direction = "lost"
    else:
        trend = "flat"
        direction = "remained steady at"

    # Analyze volatility
    range_24h = high_24h - low_24h
    volatility = "volatile" if range_24h / current_price > 0.02 else "stable"

    # Generate reasoning
    reasoning = f"The stock is trading {trend} today, having {direction} ${abs(daily_change):.2f} ({abs(daily_change_percent):.2f}%) since yesterday's close. "

    if change_24h != 0:
        reasoning += f"Over the last 24 hours, it has moved ${abs(change_24h):.2f} ({abs(change_percent_24h):.2f}%). "

    reasoning += f"The trading range in the last 24 hours was between ${low_24h:.2f} and ${high_24h:.2f}, indicating {volatility} trading conditions."

    return reasoning

async def generate_stock_response(stock_data: Dict[str, Any], user_query: str, llm: ChatGoogleGenerativeAI) -> str:
    """
    Generates a natural response about the stock with reasoning.
    """
    if not stock_data:
        return "I couldn't fetch the stock data. Please check the ticker symbol and try again."

    company_name = stock_data.get('companyName', stock_data['ticker'])
    current_price = stock_data.get('currentPrice')
    reasoning = analyze_price_movement(stock_data)

    prompt = f"""
    You are a helpful stock analyst. A user asked: "{user_query}"

    Stock data for {company_name} ({stock_data['ticker']}):
    - Current price: ${current_price:.2f}
    - Price analysis: {reasoning}

    Provide a natural, conversational response that:
    1. States the current price clearly
    2. Includes the reasoning about what's happened in the last 24 hours
    3. Keeps it concise but informative
    4. Ends with a disclaimer about not being financial advice

    Make it sound like a knowledgeable friend explaining the stock's current situation.
    """

    messages = [
        SystemMessage(content="You are a knowledgeable stock analyst providing clear, conversational updates about stock performance."),
        HumanMessage(content=prompt)
    ]

    try:
        response = await llm.ainvoke(messages)
        return response.content
    except Exception as e:
        print(f"Error generating response: {e}")
        # Fallback response
        return f"{company_name} ({stock_data['ticker']}) is currently trading at ${current_price:.2f}. {reasoning} Please note this is not financial advice."
