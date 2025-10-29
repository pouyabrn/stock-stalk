import React, { useState, useRef, useEffect } from 'react';
import { Send, TrendingUp, TrendingDown, BarChart3, Sparkles, Download, FileText, Camera } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import ReactMarkdown from 'react-markdown';

// Stock Comparison Chart Component
const ComparisonChart = ({ comparisonData }) => {
  const [visibleStocks, setVisibleStocks] = useState(() =>
    comparisonData.reduce((acc, stock) => {
      acc[stock.ticker] = true; // All stocks visible by default
      return acc;
    }, {})
  );

  const toggleStock = (ticker) => {
    setVisibleStocks(prev => ({
      ...prev,
      [ticker]: !prev[ticker]
    }));
  };

  // Generate colors for each stock
  const stockColors = comparisonData.map((_, index) => {
    const hue = (index * 137.5) % 360; // Use golden angle for distinct colors
    return {
      stroke: `hsl(${hue}, 70%, 60%)`,
      fill: `hsl(${hue}, 70%, 60%)`,
      id: `gradient-${index}`
    };
  });

  // Prepare chart data - merge all stock data by date
  const chartData = [];
  const dateMap = new Map();

  comparisonData.forEach(stock => {
    stock.monthlyData.forEach(dataPoint => {
      const date = dataPoint.date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date });
      }
      dateMap.get(date)[stock.ticker] = dataPoint.close;
    });
  });

  // Convert to array and sort by date
  chartData.push(...Array.from(dateMap.values()).sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  ));

  return (
    <div
      className="mt-3 p-5 rounded-xl backdrop-blur-sm"
      style={{
        background: 'rgba(11, 14, 16, 0.6)',
        border: '1px solid rgba(166, 179, 195, 0.1)'
      }}
    >
      {/* Header with title and controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: '#9e776f' }} />
          <h3 className="text-lg font-semibold" style={{ color: '#a6b3c3' }}>
            Stock Comparison Chart
          </h3>
        </div>
      </div>

      {/* Stock toggle buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {comparisonData.map((stock, index) => {
          const color = stockColors[index];
          const isVisible = visibleStocks[stock.ticker];
          return (
            <button
              key={stock.ticker}
              onClick={() => toggleStock(stock.ticker)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                isVisible ? 'opacity-100' : 'opacity-50'
              }`}
              style={{
                background: isVisible
                  ? `rgba(${color.stroke.match(/\d+/g).join(', ')}, 0.1)`
                  : 'rgba(166, 179, 195, 0.1)',
                border: `1px solid ${isVisible ? color.stroke : 'rgba(166, 179, 195, 0.3)'}`,
                color: isVisible ? color.stroke : '#a6b3c3'
              }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: color.stroke }}
              />
              <span className="font-medium">{stock.ticker}</span>
              <span className="text-xs opacity-75">
                ${stock.currentPrice?.toFixed(2)}
                <span className={`ml-1 ${stock.dailyChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ({stock.dailyChangePercent >= 0 ? '+' : ''}{stock.dailyChangePercent?.toFixed(2)}%)
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1f25" />
            <XAxis
              dataKey="date"
              stroke="#a6b3c3"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis
              stroke="#a6b3c3"
              style={{ fontSize: '12px' }}
              domain={['dataMin - 10', 'dataMax + 10']}
            />
            <Tooltip
              contentStyle={{
                background: '#0b0e10',
                border: '1px solid #a6b3c3',
                borderRadius: '8px',
                color: '#edf0f3'
              }}
              labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
              formatter={(value, name) => [`$${value?.toFixed(2)}`, name]}
            />
            {comparisonData.map((stock, index) => {
              const color = stockColors[index];
              const isVisible = visibleStocks[stock.ticker];
              if (!isVisible) return null;

              return (
                <Line
                  key={stock.ticker}
                  type="monotone"
                  dataKey={stock.ticker}
                  stroke={color.stroke}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: color.stroke }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 text-sm" style={{ color: '#a6b3c3' }}>
        Click on stock buttons above to toggle visibility on the chart
      </div>
    </div>
  );
};

const ChatSidebar = ({ chatHistory, currentSession, onChatSelect, onNewChat, onDeleteChat, showSidebar }) => {
  return (
    <div className={`fixed left-0 top-0 h-full w-80 bg-[#0b0e10] border-r border-gray-700 transform transition-transform duration-300 z-50 ${
      showSidebar ? 'translate-x-0' : '-translate-x-full'
    }`} style={{
      background: '#0b0e10',
      backdropFilter: 'blur(10px)'
    }}>

      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 text-white rounded-lg transition-colors"
          style={{
            background: 'linear-gradient(135deg, #9e776f 0%, #5f4051 100%)'
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chatHistory.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <p>No chat history yet</p>
            <p className="text-sm">Start a conversation to see it here</p>
          </div>
        ) : (
          chatHistory.map((chat) => (
            <div
              key={chat.id}
              className={`p-4 border-b border-gray-800 ${
                currentSession === chat.id ? 'bg-gray-800 border-l-4' : ''
              }`}
              style={currentSession === chat.id ? {
                borderLeftColor: '#9e776f'
              } : {}}
            >
              <div className="flex items-start justify-between">
                <button
                  onClick={() => onChatSelect(chat.id)}
                  className="flex-1 text-left hover:bg-gray-800 rounded p-2 -m-2 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {chat.title}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {new Date(chat.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2 ml-2">
                  {currentSession === chat.id && (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#9e776f' }}></div>
                  )}
                  {currentSession !== chat.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(chat.id);
                      }}
                      className="p-1 rounded hover:bg-red-600 transition-colors opacity-60 hover:opacity-100"
                      title="Delete chat"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const StalkStockChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const chartRefs = useRef({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check backend connectivity
  const checkBackendStatus = async () => {
    try {
      const response = await fetch('/api/', {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      const online = response.ok;
      setIsOnline(online);
      return online;
    } catch (error) {
      console.error('Backend check failed:', error);
      setIsOnline(false);
      return false;
    }
  };

  // Load chat history from backend
  const loadChatHistory = async () => {
    try {
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json();
        setChatHistory(data.chats);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Load messages for a specific chat
  const loadChatMessages = async (chatId) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        // Transform backend messages to frontend format
        const frontendMessages = data.messages.map(msg => {
          // Transform monthlyData into chartData format for rendering
          let chartData = null;
          if (msg.monthlyData && Array.isArray(msg.monthlyData)) {
            chartData = msg.monthlyData.map(d => ({
              date: d.date,
              close: d.close,
              volume: d.volume
            }));
          }

          return {
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            price: msg.price,
            changePercent: msg.changePercent,
            monthlyData: msg.monthlyData,
            comparisonData: msg.comparisonData,
            chartData: chartData,
            isStreaming: false
          };
        });
        setMessages(frontendMessages);
        setCurrentSession(chatId);
        setShowSidebar(false);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  // Create new chat
  const createNewChat = () => {
    setMessages([]);
    setCurrentSession(null);
    setShowSidebar(false);
  };

  // Delete a chat
  const deleteChat = async (chatId) => {
    if (chatId === currentSession) {
      // Don't allow deleting the current chat
      return;
    }

    try {
      const response = await fetch(`/api/chat/${chatId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove from local state
        setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
        // Reload chat history to ensure consistency
        loadChatHistory();
      } else {
        console.error('Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check backend status on app load
    checkBackendStatus();

    // Load chat history
    loadChatHistory();
  }, []);

  // Add welcome message only once, even across hot reloads
  useEffect(() => {
    const welcomeShown = localStorage.getItem('stockStalkWelcomeShown');
    if (!welcomeShown) {
      localStorage.setItem('stockStalkWelcomeShown', 'true');
      setMessages([{
        role: 'assistant',
        content: 'Welcome to Stock Stalk! I\'m your AI finance agent. Ask me about stock prices, market trends, or any financial insights you need.',
        timestamp: new Date(),
        id: 'welcome-' + Date.now(),
      }]);
    }
  }, []);

  // Generate random color palette for charts
  const generateChartColors = () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.floor(Math.random() * 20);
    const lightness = 55 + Math.floor(Math.random() * 15);

    return {
      stroke: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      fill: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      gradientId: `gradient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  };

  // BACKEND INTEGRATION: Real API call to FastAPI backend
  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
      id: Date.now() + '-' + Math.random(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          ...(currentSession && { session_id: currentSession }),
        })
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      // Mark backend as online since we got a response
      setIsOnline(true);

      // Update current session if this is a new chat
      if (data.session_id && !currentSession) {
        setCurrentSession(data.session_id);
        // Reload chat history to include the new chat
        loadChatHistory();
      }

      // Check if response is an array (multiple stocks) or single response
      if (Array.isArray(data.response)) {
        // Handle multiple stock responses - stream sequentially for reliability
        for (const response of data.response) {
          await simulateStreamingResponse(response, 3); // Fast sequential streaming
        }
        setIsStreaming(false); // Reset streaming state
      } else {
        // Handle single response (general finance or single stock)
        await simulateStreamingResponse(data.response, 10); // Normal speed for single response
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);
      // Mark backend as offline
      setIsOnline(false);
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error connecting to the backend. Please try again.',
        timestamp: new Date(),
        isError: true
      }]);
    }
  };

  // BACKEND INTEGRATION: Text Streaming Handler
  const simulateStreamingResponse = async (apiResponse, delay = 10) => {
    const fullResponse = apiResponse.message;

    let streamedContent = '';

    // STEP 1: Create initial assistant message with streaming state
    const assistantMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      id: Date.now() + '-' + Math.random(),
      isStreaming: true,  // This flag shows the typing indicator
      price: apiResponse.price,  // Store price for later display
      changePercent: apiResponse.changePercent,  // Store change % for later display
    };

    setMessages(prev => [...prev, assistantMessage]);

    // STEP 2: Stream the text character by character
    for (let i = 0; i < fullResponse.length; i++) {
      streamedContent += fullResponse[i];

      // Update the message content with the new character
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          ...newMessages[newMessages.length - 1],
          content: streamedContent,
        };
        return newMessages;
      });

      // Adjust this delay to control typing speed (milliseconds)
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // STEP 3: After text streaming completes, add chart data and finalize message
    setMessages(prev => {
      const newMessages = [...prev];
      const chartColors = generateChartColors();
      newMessages[newMessages.length - 1] = {
        ...newMessages[newMessages.length - 1],
        isStreaming: false,  // Turn off streaming state (removes typing indicator)

        // Handle comparison data for multiple stocks
        comparisonData: apiResponse.comparisonData,

        // Transform the API data into chart-friendly format (for single stocks)
        chartData: apiResponse.monthlyData?.data?.map(d => ({
          date: d.date,      // Keep date for X-axis
          close: d.close,    // Closing price for Y-axis
          volume: d.volume   // Volume (optional, not currently displayed)
        })),

        ticker: apiResponse.monthlyData?.ticker,  // Stock ticker for chart title
        chartColors: chartColors  // Random colors generated for this chart
      };
      return newMessages;
    });

    setIsStreaming(false);  // Allow user to send another message
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Export Functions
  const exportAsText = (message, index) => {
    const content = `Stock Stalk Response - ${message.timestamp.toLocaleString()}\n\n${message.content}\n\n${
      message.price ? `Price: $${message.price}\nChange: ${message.changePercent}%\n\n` : ''
    }${
      message.chartData ? `Chart Data (${message.ticker}):\n${JSON.stringify(message.chartData, null, 2)}` : ''
    }`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stalk-stock-response-${index}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(null);
  };

  const exportAsJSON = (message, index) => {
    const exportData = {
      timestamp: message.timestamp.toISOString(),
      content: message.content,
      price: message.price,
      changePercent: message.changePercent,
      ticker: message.ticker,
      chartData: message.chartData,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stalk-stock-response-${index}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(null);
  };

  const exportAsMarkdown = (message, index) => {
    const content = `# Stock Stalk Response\n\n**Date:** ${message.timestamp.toLocaleString()}\n\n${
      message.price ? `**Price:** $${message.price} (${message.changePercent > 0 ? '+' : ''}${message.changePercent}%)\n\n` : ''
    }## Analysis\n\n${message.content}\n\n${
      message.chartData ? `## Chart Data: ${message.ticker}\n\n\`\`\`json\n${JSON.stringify(message.chartData, null, 2)}\n\`\`\`` : ''
    }`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stalk-stock-response-${index}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(null);
  };

  const exportChartAsImage = async (message, index) => {
    const chartElement = chartRefs.current[index];
    if (!chartElement) return;

    try {
      const svgElement = chartElement.querySelector('svg');
      if (!svgElement) return;

      const svgClone = svgElement.cloneNode(true);
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '100%');
      rect.setAttribute('height', '100%');
      rect.setAttribute('fill', '#0b0e10');
      svgClone.insertBefore(rect, svgClone.firstChild);

      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svgElement.clientWidth * 2;
        canvas.height = svgElement.clientHeight * 2;
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          const pngUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = pngUrl;
          a.download = `stalk-stock-chart-${index}.png`;
          a.click();
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
        });
      };
      img.src = url;
    } catch (error) {
      console.error('Error exporting chart:', error);
    }
    setShowExportMenu(null);
  };

  const exportFullConversation = () => {
    const conversationText = messages.map((msg, idx) => {
      return `[${msg.role.toUpperCase()}] ${msg.timestamp.toLocaleString()}\n${msg.content}\n${
        msg.price ? `Price: $${msg.price} (${msg.changePercent}%)\n` : ''
      }\n---\n`;
    }).join('\n');

    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stalk-stock-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col pb-32" style={{
      background: '#0b0e10',
      color: '#edf0f3'
    }}>
      {/* Chat Sidebar */}
      <ChatSidebar
        chatHistory={chatHistory}
        currentSession={currentSession}
        onChatSelect={loadChatMessages}
        onNewChat={createNewChat}
        onDeleteChat={deleteChat}
        showSidebar={showSidebar}
      />

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-opacity-10 rounded-full blur-3xl animate-pulse"
             style={{ background: 'radial-gradient(circle, rgba(158, 119, 111, 0.15) 0%, transparent 70%)' }}></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-opacity-10 rounded-full blur-3xl animate-pulse delay-1000"
             style={{ background: 'radial-gradient(circle, rgba(166, 179, 195, 0.1) 0%, transparent 70%)' }}></div>
      </div>

      {/* Header */}
      <header className={`fixed top-0 z-10 border-b px-6 py-4 bg-[#0b0e10] transition-all duration-300 ${
        showSidebar ? 'left-80 right-0' : 'left-0 right-0'
      }`} style={{ borderColor: '#1a1f25' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 rounded-lg hover:opacity-80 transition-colors"
              style={{ background: 'rgba(158, 119, 111, 0.1)' }}
              title="Chat History"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #9e776f 0%, #5f4051 100%)' }}>
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Stock Stalk</h1>
              <p className="text-sm" style={{ color: '#a6b3c3' }}>AI Finance Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm" style={{ color: '#a6b3c3' }}>
              <div
                className={`w-2 h-2 rounded-full ${isOnline ? 'animate-pulse' : ''}`}
                style={{ background: isOnline ? '#22c55e' : '#ef4444' }}
              ></div>
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <button
              onClick={exportFullConversation}
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:scale-105"
              style={{
                background: 'rgba(158, 119, 111, 0.1)',
                border: '1px solid rgba(158, 119, 111, 0.3)',
                color: '#9e776f'
              }}
            >
              <Download className="w-4 h-4" />
              Export Chat
            </button>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto px-6 pb-8 pt-20 transition-all duration-300 ${
          showSidebar ? 'md:ml-80' : ''
        }`}
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#a6b3c3 #0b0e10' }}
      >
        <div className="max-w-5xl mx-auto space-y-6 pb-4">
          {messages.map((message, index) => (
            <div
              key={message.id || (message.timestamp.getTime() + '-' + index)}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div className={`max-w-3xl ${message.role === 'user' ? 'w-auto' : 'w-full'}`}>
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 ml-1">
                    <Sparkles className="w-4 h-4" style={{ color: '#9e776f' }} />
                    <span className="text-sm font-medium" style={{ color: '#a6b3c3' }}>
                      Stock Stalk
                    </span>
                    {!message.isStreaming && message.price && (
                      <div className="relative ml-auto">
                        <button
                          onClick={() => setShowExportMenu(showExportMenu === index ? null : index)}
                          className="p-1.5 rounded-lg transition-all hover:scale-110"
                          style={{
                            background: 'rgba(158, 119, 111, 0.1)',
                            border: '1px solid rgba(158, 119, 111, 0.2)',
                          }}
                        >
                          <Download className="w-3.5 h-3.5" style={{ color: '#9e776f' }} />
                        </button>

                        {showExportMenu === index && (
                          <div
                            className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl z-50 overflow-hidden"
                            style={{
                              background: '#0b0e10',
                              border: '1px solid rgba(166, 179, 195, 0.2)',
                            }}
                          >
                            <button
                              onClick={() => exportAsText(message, index)}
                              className="w-full px-4 py-2.5 flex items-center gap-3 transition-all"
                              style={{
                                color: '#edf0f3',
                                background: 'transparent',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(158, 119, 111, 0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <FileText className="w-4 h-4" />
                              <span className="text-sm">Export as TXT</span>
                            </button>
                            <button
                              onClick={() => exportAsJSON(message, index)}
                              className="w-full px-4 py-2.5 flex items-center gap-3 transition-all"
                              style={{
                                color: '#edf0f3',
                                background: 'transparent',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(158, 119, 111, 0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <BarChart3 className="w-4 h-4" />
                              <span className="text-sm">Export as JSON</span>
                            </button>
                            <button
                              onClick={() => exportAsMarkdown(message, index)}
                              className="w-full px-4 py-2.5 flex items-center gap-3 transition-all"
                              style={{
                                color: '#edf0f3',
                                background: 'transparent',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(158, 119, 111, 0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <FileText className="w-4 h-4" />
                              <span className="text-sm">Export as MD</span>
                            </button>
                            {message.chartData && (
                              <button
                                onClick={() => exportChartAsImage(message, index)}
                                className="w-full px-4 py-2.5 flex items-center gap-3 transition-all border-t"
                                style={{
                                  color: '#edf0f3',
                                  background: 'transparent',
                                  borderColor: 'rgba(166, 179, 195, 0.1)',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(158, 119, 111, 0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                <Camera className="w-4 h-4" />
                                <span className="text-sm">Export Chart as PNG</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* MESSAGE BLOCK */}
                <div
                  className={`rounded-2xl px-5 py-4 ${
                    message.role === 'user'
                      ? 'ml-auto'
                      : 'backdrop-blur-sm'
                  }`}
                  style={
                    message.role === 'user'
                      ? {
                          background: 'linear-gradient(135deg, #9e776f 0%, #5f4051 100%)',
                          maxWidth: 'fit-content'
                        }
                      : {
                          background: 'rgba(166, 179, 195, 0.05)',
                          border: '1px solid rgba(166, 179, 195, 0.1)'
                        }
                  }
                >
                  <div className="text-base leading-relaxed">
                    <ReactMarkdown
                      components={{
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({children}) => <strong className="font-bold">{children}</strong>,
                        em: ({children}) => <em className="italic">{children}</em>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                    {message.isStreaming && (
                      <span className="inline-block w-1 h-4 ml-1 animate-pulse" style={{ background: '#a6b3c3' }}></span>
                    )}
                  </div>
                </div>

                {/* PRICE BLOCK */}
                {message.role === 'assistant' && message.price != null && !message.isStreaming && (
                  <div
                    className="mt-3 rounded-xl px-5 py-4 backdrop-blur-sm flex items-center justify-between"
                    style={{
                      background: 'rgba(11, 14, 16, 0.6)',
                      border: '1px solid rgba(166, 179, 195, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {message.changePercent >= 0 ? (
                        <TrendingUp className="w-5 h-5" style={{ color: '#22c55e' }} />
                      ) : (
                        <TrendingDown className="w-5 h-5" style={{ color: '#ef4444' }} />
                      )}
                      <div>
                        <div
                          className="text-3xl font-bold"
                          style={{ color: message.changePercent >= 0 ? '#22c55e' : '#ef4444' }}
                        >
                          ${message.price?.toFixed(2)}
                        </div>
                        <div
                          className="text-sm font-medium"
                          style={{ color: message.changePercent >= 0 ? '#22c55e' : '#ef4444' }}
                        >
                          {message.changePercent >= 0 ? '+' : ''}{message.changePercent?.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CHART BLOCK */}
                {message.chartData && !message.isStreaming && (
                  <div
                    ref={(el) => chartRefs.current[index] = el}
                    className="mt-3 p-4 rounded-xl backdrop-blur-sm"
                    style={{
                      background: 'rgba(11, 14, 16, 0.6)',
                      border: '1px solid rgba(166, 179, 195, 0.1)'
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4" style={{ color: message.chartColors?.stroke || '#9e776f' }} />
                      <h3 className="text-sm font-semibold">{message.ticker} - 30 Day Performance</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={message.chartData}>
                        <defs>
                          <linearGradient id={message.chartColors?.gradientId || "colorPrice"} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={message.chartColors?.fill || "#9e776f"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={message.chartColors?.fill || "#9e776f"} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1f25" />
                        <XAxis
                          dataKey="date"
                          stroke="#a6b3c3"
                          style={{ fontSize: '11px' }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis
                          stroke="#a6b3c3"
                          style={{ fontSize: '11px' }}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip
                          contentStyle={{
                            background: '#0b0e10',
                            border: '1px solid #a6b3c3',
                            borderRadius: '8px',
                            color: '#edf0f3'
                          }}
                          labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          formatter={(value) => [`$${value.toFixed(2)}`, 'Close']}
                        />
                        <Area
                          type="monotone"
                          dataKey="close"
                          stroke={message.chartColors?.stroke || "#9e776f"}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill={`url(#${message.chartColors?.gradientId || "colorPrice"})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* COMPARISON CHART BLOCK */}
                {message.comparisonData && message.comparisonData.length > 1 && !message.isStreaming && (
                  <ComparisonChart comparisonData={message.comparisonData} />
                )}

                {message.role === 'user' && (
                  <div className="text-xs text-right mt-1 mr-1" style={{ color: '#5f4051' }}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>


      {/* Input Area */}
      <div className={`fixed bottom-0 z-10 border-t px-6 py-6 bg-[#0b0e10] transition-all duration-300 ${
        showSidebar ? 'left-80 right-0' : 'left-0 right-0'
      }`} style={{
        borderColor: '#1a1f25',
        backdropFilter: 'blur(10px)'
      }}>
        <div className="max-w-5xl mx-auto">
          <div className="relative flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about stocks, market trends, or financial insights..."
                disabled={isStreaming}
                rows={1}
                className="w-full px-5 py-4 pr-12 rounded-2xl resize-none focus:outline-none focus:ring-2 transition-all"
                style={{
                  background: 'rgba(166, 179, 195, 0.05)',
                  border: '1px solid rgba(166, 179, 195, 0.2)',
                  color: '#edf0f3',
                  focusRingColor: '#9e776f'
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
              className="p-4 rounded-2xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{
                background: input.trim() && !isStreaming
                  ? 'linear-gradient(135deg, #9e776f 0%, #5f4051 100%)'
                  : 'rgba(166, 179, 195, 0.1)',
              }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs mt-3 text-center" style={{ color: '#5f4051' }}>
            Stock Stalk can make mistakes. Consider verifying important financial information.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        textarea:focus {
          ring: 2px solid #9e776f;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #0b0e10;
        }
        ::-webkit-scrollbar-thumb {
          background: #a6b3c3;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #9e776f;
        }
      `}</style>
    </div>
  );
};

export default StalkStockChat;
