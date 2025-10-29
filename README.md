# Stock Stalk

This is Stock Stalk, a pretty cool AI-powered chat app I built for digging into stock market data. It lets you have natural conversations about stocks, compare multiple companies side-by-side, and see everything visualized with interactive charts that actually make sense.

Basically, you can ask it stuff like "How's Apple doing lately?" or "Compare Tesla vs Ford for me" and get back real analysis from Google's Gemini AI plus beautiful charts showing the actual market data.

## What's Under the Hood

### The Brain (Backend)
The backend is where all the smart stuff happens. I used LangGraph to build a decision tree that figures out what you're asking about:

- **Question Detective**: Spots whether you're asking about specific stocks or just general finance stuff
- **Stock Data Fetcher**: Grabs real-time info from yFinance when you mention tickers
- **Comparison Coordinator**: Handles those "compare AAPL vs MSFT" requests
- **Finance Chat Handler**: Deals with general questions like "What's compound interest?"

**AI Power**: Google's Gemini 2.5-flash does the heavy lifting for analysis, with prompts I tweaked to give actually useful financial insights instead of generic AI responses.

**Data Flow**: yFinance feeds us live market data - prices, trends, 30-day histories. The system caches smartly and handles rate limits so you don't get blocked from the data source.

**Chat Memory**: Everything runs on SQLite with SQLAlchemy handling the database work. Your chats stick around even if the server restarts, which is nice when you're in the middle of analyzing a portfolio.

### The Face (Frontend)
Now here's where it gets interesting - I built this entire React frontend from scratch knowing absolutely nothing about React. Zero. Zilch. The whole thing was coded by grok-code-fast-1, which is basically like having an AI coding buddy who actually understands what you want.

What came out the other end:
- **Live Typing Effect**: Watch the AI "type" responses in real-time
- **Interactive Charts**: Toggle different stocks on/off, drag to zoom, all that good stuff
- **Chat Management**: Save, load, delete conversations like a proper chat app
- **Connection Status**: Green dot when everything's working, red when it's not
- **Mobile Ready**: Looks good on phones, tablets, whatever you've got
- **Export Everything**: Save chats as text, JSON, or even chart images

## Getting This Running on Your Machine

### Quick Docker Setup (Easiest Way)

1. **Grab the code**
   ```bash
   git clone <your-repo-url>
   cd stock-stalk
   ```

2. **Set up your API key**
   ```bash
   cd backend
   copy example.env .env
   # Open .env and paste your Google Gemini API key where it says YOUR_API_KEY
   ```

3. **Fire it up**
   ```bash
   cd ..
   docker-compose up --build -d
   ```

4. **Check it out**
   - Frontend: http://localhost:3000 (the pretty interface)
   - Backend: http://localhost:8000 (API docs if you're curious)

### Manual Setup (For Developers)

**Backend only:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend only:**
```bash
cd frontend
npm install
npm run dev
```

Run both commands in different terminals if you want the full experience.

## Taking It to the Cloud

Want to show this off to the world? The whole thing can run on AWS using Terraform (that's Infrastructure as Code for you fancy folks).

### AWS Deployment Walkthrough

1. **Head to the infrastructure folder**
   ```bash
   cd infrastructure
   copy terraform.tfvars.example terraform.tfvars
   # Fill in your AWS details - keys, region, etc.
   ```

2. **Launch it**
   ```bash
   terraform init  # Sets up Terraform
   terraform plan  # Shows what it'll create
   terraform apply # Actually builds everything
   ```

3. **Your app goes live**
   Terraform will spit out a URL where your app is running. Boom - production ready!

### What You Get in the Cloud

- **ECS Fargate**: Runs your containers without managing servers (serverless containers FTW)
- **Load Balancer**: Spreads traffic intelligently and keeps things healthy
- **ECR**: Private spot for your Docker images
- **CloudWatch**: Monitors everything and tells you if stuff breaks
- **VPC Setup**: Proper network isolation so it's actually secure
- **CI/CD**: GitHub Actions automatically rebuild and redeploy when you push code

## The API Brain

The backend serves up a clean REST API built with FastAPI. It's fast, well-documented, and handles everything the frontend needs.

### Main Chat Endpoints

**POST /chat** - The star of the show
```
{
  "message": "How are AAPL and MSFT performing?",
  "session_id": "optional-existing-session"
}
```
This endpoint does all the heavy lifting - figures out what you want, fetches data, runs AI analysis, and sends back everything needed for a complete response.

**GET /chats** - Your conversation list
Returns all your saved chat sessions.

**GET /chat/{chat_id}** - Dive into a specific chat
Pulls up all messages from one conversation.

**DELETE /chat/{chat_id}** - Clean house
Removes a chat and all its messages.

### How the API Actually Works

FastAPI makes this thing zippy with async operations. Every endpoint gets:
- Automatic input validation (thanks Pydantic)
- Proper error messages when things go wrong
- Database hooks for saving your chats
- CORS setup so the frontend can actually talk to it
- Health checks to make sure everything's running

**Database Stuff**: Chats get unique IDs, messages have timestamps, and everything persists to SQLite. The system even auto-generates chat titles from your first message.

**Stock Data Magic**: yFinance integration with all the safety nets - timeouts, retries, validation. If a stock ticker doesn't exist, it tells you instead of crashing.

## How All the Pieces Fit Together

### The LangGraph Decision Tree

The AI brain works like a flowchart that routes your questions to the right handlers:

1. **You ask something** → System receives your message
2. **Question triage** → Is this about stocks or general finance talk?
3. **Data grab** → If stocks mentioned, pulls live data from yFinance
4. **AI processing** → Gemini analyzes everything and gives insights
5. **Package it up** → Formats response for the frontend
6. **Comparison mode** → Special handling when you want to compare multiple stocks

### Data Pipeline & Storage

**yFinance - The Data Source**: This library is gold for stock data. Every query gets you:
- Live prices and daily performance
- 30 days of historical data for charts
- Volume numbers and market caps
- Built-in rate limiting so you don't get banned

The system is smart about failures - if the market's crazy volatile or the API's acting up, it retries and has fallbacks.

**SQLite - The Chat Memory**: I set up a proper database schema because chats should stick around:

- **Users table**: Ready for multi-user (even though it's single-user now)
- **Chats table**: Your conversation sessions with auto-generated titles
- **Messages table**: Every message saved with timestamps and who said what
- **Smart indexing**: Fast lookups so loading chats doesn't suck
- **Relationships**: Proper foreign keys so deleting a chat cleans up everything

Your chat history survives server restarts thanks to Docker volume mounting.

### Frontend Architecture

Look, I went into this knowing absolutely nothing about React. Zero experience. The entire frontend was built by having conversations with grok-code-fast-1. It's actually kind of amazing what came out:

- **React hooks and components**: Modern patterns that actually work
- **State management**: Keeps track of chats, streaming, all that UI state
- **Live streaming**: Watch responses appear character by character
- **Chart magic**: Recharts makes beautiful, interactive graphs
- **Clean code**: Components are organized and actually maintainable

## Database & Data Details

### SQLite Schema (The Blueprint)

The database is structured like this for maximum efficiency:

```sql
-- The core tables
CREATE TABLE users (id, username, created_at);
CREATE TABLE chats (id, user_id, title, created_at, updated_at);
CREATE TABLE messages (id, chat_id, role, content, timestamp, metadata);

-- Speed things up with indexes
CREATE INDEX idx_chats_user ON chats(user_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
```

Built for future growth - could easily add multi-user support later. Right now it's single-user but the relationships are all set up properly with cascading deletes and all that good stuff.

### yFinance Integration Patterns

I implemented a few different ways to use yFinance depending on what you're asking:

- **Quick price checks**: Fast lookup for current data when you just want a stock's price
- **Chart data**: 30-day histories formatted perfectly for the frontend charts
- **Multi-stock battles**: Parallel processing when comparing AAPL vs MSFT vs GOOGL
- **Smart validation**: Checks if tickers actually exist before wasting time
- **Caching layer**: Remembers recent data so you don't hammer the API

Everything has error handling - network timeouts, invalid tickers, rate limits. The system degrades gracefully instead of crashing when markets are wild or APIs are slow.

## A Quick Personal Note

This whole thing was just a fun week-long project for me to stretch my skills - nothing meant to change the world or anything. The backend shows what someone with solid backend experience can put together, and the frontend proves that AI coding assistants can actually build something decent even when the human has zero React knowledge.

If you find bugs, have ideas for improvements, or want to chat about how I approached any of this, hit me up. I'm always up for discussing the technical side of things or hearing how you might have done it differently.

---

Built with curiosity and AI assistance.


<img width="1919" height="1372" alt="screencapture-localhost-3000-2025-10-29-15_41_02" src="https://github.com/user-attachments/assets/6e72caf9-e069-47ee-9414-244c4e47b0be" />
<img width="1919" height="2483" alt="screencapture-localhost-3000-2025-10-29-15_43_14" src="https://github.com/user-attachments/assets/b0a574a0-5a3f-413c-8a49-661e620bb045" />
<img width="1919" height="1702" alt="screencapture-localhost-3000-2025-10-29-15_50_53 (1)" src="https://github.com/user-attachments/assets/dec984f9-8691-404c-b116-a216c5b3bf7d" />

