import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { source: string; section: string }[];
  leadTrigger?: string | null;
}

interface SuggestedPrompt {
  text: string;
  textEn: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showLeadCapture, setShowLeadCapture] = useState(false);
  const [leadEmail, setLeadEmail] = useState('');
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadTriggerQuestion, setLeadTriggerQuestion] = useState('');
  const [leadTriggerType, setLeadTriggerType] = useState('');
  const [suggestedPrompts, setSuggestedPrompts] = useState<SuggestedPrompt[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load suggested prompts on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/chat/suggested-prompts`)
      .then(res => res.json())
      .then(data => setSuggestedPrompts(data.prompts || []))
      .catch(err => console.error('Failed to load prompts:', err));
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const generateId = () => Math.random().toString(36).substring(2, 11);

  const sendMessage = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: question.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          sessionId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get response');
      }

      // Update session ID
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.response,
        sources: data.sources,
        leadTrigger: data.leadTrigger
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Check for lead trigger
      if (data.leadTrigger) {
        setLeadTriggerQuestion(question.trim());
        setLeadTriggerType(data.leadTrigger);
        setTimeout(() => setShowLeadCapture(true), 1000);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'Sorry, a technical error occurred. Please try again later.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handlePromptClick = (prompt: SuggestedPrompt) => {
    sendMessage(prompt.text);
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail.trim() || leadSubmitting) return;

    setLeadSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: leadEmail.trim(),
          question: leadTriggerQuestion,
          triggerType: leadTriggerType,
          sessionId
        })
      });

      const data = await response.json();

      if (response.ok) {
        const confirmMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: 'Thank you! We will contact you soon. 📬'
        };
        setMessages(prev => [...prev, confirmMessage]);
        setShowLeadCapture(false);
        setLeadEmail('');
      } else {
        throw new Error(data.message);
      }

    } catch (error) {
      console.error('Lead capture error:', error);
    } finally {
      setLeadSubmitting(false);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 ${
          isOpen ? 'bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'
        }`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-blue-600 px-4 py-4 text-white">
            <h3 className="font-semibold text-lg">Ask SignalTrue</h3>
            <p className="text-blue-100 text-sm">Answers based on SignalTrue documentation</p>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96 min-h-[300px] bg-gray-50">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm text-center">
                  Hi! I can answer questions about SignalTrue's product, privacy, and pilot process.
                </p>
                
                {/* Suggested Prompts */}
                {suggestedPrompts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 text-center">Quick questions:</p>
                    {suggestedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePromptClick(prompt)}
                        className="w-full text-left px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        {prompt.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white text-gray-800 rounded-bl-md border border-gray-200 shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Sources: {message.sources.map(s => s.source).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 border border-gray-200 shadow-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                </div>
              </div>
            )}

            {/* Lead Capture Form */}
            {showLeadCapture && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-700 mb-3">
                  Would you like us to contact you? Leave your email.
                </p>
                <form onSubmit={submitLead} className="flex gap-2">
                  <Input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 text-sm"
                    disabled={leadSubmitting}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={leadSubmitting || !leadEmail.trim()}
                  >
                    {leadSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                  </Button>
                </form>
                <button
                  onClick={() => setShowLeadCapture(false)}
                  className="text-xs text-gray-500 mt-2 hover:text-gray-700"
                >
                  No, thanks
                </button>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your question..."
                className="flex-1"
                disabled={isLoading}
                maxLength={1000}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !inputValue.trim()}
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>

          {/* Privacy Notice */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              This chat doesn't store personal data or learn from conversations.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
