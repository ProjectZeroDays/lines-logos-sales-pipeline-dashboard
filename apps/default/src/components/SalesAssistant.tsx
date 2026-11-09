import { useState, useRef, useEffect } from 'react';
import { useAgentChat } from '@/lib/agent-chat';
import { MessageSquare, Send, X, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const AGENT_ID = '01M5Q02ZMX958H8AN4ZVJ31DBQ';

export function SalesAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { 
    sendMessage, 
    messages, 
    isConnected, 
    createConversation: createNewConversation,
    error 
  } = useAgentChat(AGENT_ID, conversationId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [startFailed, setStartFailed] = useState(false);

  const handleStartChat = async () => {
    setStartFailed(false);
    try {
      const newConvoId = await createNewConversation();
      setConversationId(newConvoId);
    } catch (err) {
      console.error('Could not start the chat:', err);
      setStartFailed(true);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !conversationId) return;
    
    const text = input;
    setInput('');
    try {
      await sendMessage(text);
    } catch (err) {
      console.error('Could not send the message:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        onClick={() => setIsOpen(true)}
        aria-label="Open the sales assistant"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-center gap-2 sm:gap-3 px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 group"
      >
        <Sparkles className="w-5 h-5 text-white" />
        <span className="font-semibold text-white">Ask AI</span>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-gradient-to-br from-slate-900 to-slate-950 border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 backdrop-blur-lg">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  {isConnected && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white">Sales Intelligence</h3>
                  <p className="text-xs text-white/60">
                    {isConnected ? 'Connected' : 'Connecting...'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!conversationId ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-2">Ask about your pipeline</h4>
                    <p className="text-sm text-white/60 mb-6">
                      Ask me about pipeline health, deal strategies, or performance insights.
                    </p>
                  </div>
                  <button
                    onClick={handleStartChat}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-medium text-white hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300"
                  >
                    Start Conversation
                  </button>
                  
                  <div className="space-y-2 w-full mt-8">
                    <p className="text-xs text-white/40 mb-3">Try asking:</p>
                    {['Which deals are most likely to close?', 'Which deals need attention this week?', 'What is our total open pipeline?'].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={async () => {
                          await handleStartChat();
                          setTimeout(() => setInput(suggestion), 100);
                        }}
                        className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left text-sm text-white/80 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'flex gap-3',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-3',
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                            : 'bg-white/5 border border-white/10 text-white'
                        )}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                        {message.toolCalls && message.toolCalls.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <p className="text-xs text-white/40">Using tools...</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}

              {(error || startFailed) && (
                <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  The assistant could not answer right now. Please try again in a moment.
                </div>
              )}
            </div>

            {/* Input */}
            {conversationId && (
              <div className="p-6 border-t border-white/10 bg-white/5 backdrop-blur-lg">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your pipeline..."
                    disabled={!isConnected}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim() || !isConnected}
                    className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 group"
                  >
                    {!isConnected ? (
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
