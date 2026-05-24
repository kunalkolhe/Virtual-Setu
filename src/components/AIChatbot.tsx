import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  User, 
  Send, 
  MessageCircle, 
  X, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Lightbulb,
  Target,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Gemini AI Integration
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyBgrD2jwHhMXl8dFTCUfU_twpFluMb1FsQ';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  action?: {
    type: 'navigate' | 'upload' | 'checklist';
    data: any;
  };
}

interface Document {
  id: string;
  document_name: string;
  document_type: string;
  created_at: string;
}

const quickActions = [
  { label: "What documents do I need for passport?", query: "passport documents" },
  { label: "Check my document status", query: "document status" },
  { label: "What can I apply for?", query: "applications available" },
  { label: "Help with document upload", query: "upload help" },
  { label: "Bank account documents", query: "bank account documents" },
  { label: "Job application help", query: "job application documents" },
  { label: "Driving license requirements", query: "driving license documents" }
];

const documentGuidance = {
  'passport': {
    required: ['Aadhar Card', 'PAN Card', 'Birth Certificate', 'Address Proof', 'Photo', 'Signature'],
    optional: ['Marriage Certificate', 'Divorce Decree'],
    process: [
      'Fill online application form',
      'Book appointment at Passport Seva Kendra',
      'Submit documents and biometrics',
      'Track application status',
      'Collect passport when ready'
    ],
    timeline: '15-30 days',
    cost: '₹1,500 - ₹3,500'
  },
  'driving_license': {
    required: ['Aadhar Card', 'Age Proof', 'Address Proof', 'Medical Certificate'],
    optional: ['Previous License'],
    process: [
      'Apply online on Parivahan website',
      'Book slot for driving test',
      'Pass written and practical tests',
      'Submit documents',
      'Collect license'
    ],
    timeline: '7-15 days',
    cost: '₹200 - ₹500'
  },
  'bank_account': {
    required: ['Aadhar Card', 'PAN Card', 'Address Proof', 'Income Proof', 'Photo'],
    optional: ['Employment Letter', 'Business Registration'],
    process: [
      'Choose bank and account type',
      'Fill application form',
      'Submit KYC documents',
      'Complete verification',
      'Activate account'
    ],
    timeline: '1-3 days',
    cost: '₹0 - ₹500'
  }
};

interface AIChatbotProps {
  documents: Document[];
  onClose?: () => void;
}

export default function AIChatbot({ documents, onClose }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hi! I'm your Virtual Setu AI assistant. I can help you with document requirements, application processes, and guide you through any questions. What would you like to know?",
      timestamp: new Date(),
      suggestions: [
        "What documents do I need for passport?",
        "Check my current documents",
        "What can I apply for?",
        "Help with document upload"
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const analyzeDocuments = () => {
    const docs = documents.map(doc => ({
      type: doc.document_type.toLowerCase(),
      name: doc.document_name.toLowerCase()
    }));

    return {
      hasAadhar: docs.some(doc => doc.type.includes('aadhar') || doc.name.includes('aadhar')),
      hasPan: docs.some(doc => doc.type.includes('pan') || doc.name.includes('pan')),
      hasBirthCert: docs.some(doc => doc.type.includes('birth') || doc.name.includes('birth') || doc.name.includes('10th')),
      hasAddressProof: docs.some(doc => doc.type.includes('address') || doc.name.includes('utility') || doc.name.includes('bill')),
      hasEducation: docs.some(doc => doc.type.includes('education') || doc.name.includes('degree') || doc.name.includes('certificate')),
      hasAgeProof: docs.some(doc => doc.type.includes('age') || doc.name.includes('birth') || doc.name.includes('10th')),
      hasPhoto: docs.some(doc => doc.type.includes('photo') || doc.name.includes('photo')),
      hasIncomeProof: docs.some(doc => doc.type.includes('income') || doc.name.includes('salary') || doc.name.includes('itr'))
    };
  };

  // Call Gemini AI for intelligent responses
  const callGeminiAI = async (userMessage: string, context: any) => {
    try {
      const prompt = `
        You are a helpful AI assistant for Virtual Setu, a digital document management app.
        
        User's current documents: ${JSON.stringify(documents.map(d => d.document_name))}
        User's question: "${userMessage}"
        Context: ${JSON.stringify(context)}
        
        Please provide a helpful, personalized response about document requirements and applications.
        Be specific about what documents they need and what they already have.
        Keep responses concise and actionable.
        If the user asks about driving license, provide detailed requirements and process.
      `;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I couldn\'t process your request right now.';
    } catch (error) {
      console.error('Gemini AI error:', error);
      // Return a helpful fallback response instead of generic error
      return `I understand you're asking about "${userMessage}". Let me provide you with the information you need:

For ${userMessage.includes('bank') ? 'bank account' : userMessage.includes('job') ? 'job application' : 'document'} documents, you typically need:
${userMessage.includes('bank') ? 
  '• Aadhar Card\n• PAN Card\n• Address Proof\n• Income Proof\n• Photo' :
  userMessage.includes('job') ?
  '• Resume/CV\n• Aadhar Card\n• PAN Card\n• Education Certificates\n• Photo' :
  '• Aadhar Card\n• PAN Card\n• Address Proof\n• Photo'
}

Would you like me to check your current documents and see what you're missing?`;
    }
  };

  const generateBotResponse = (userMessage: string): Message => {
    const message = userMessage.toLowerCase();
    const timestamp = new Date();

    // Document status queries
    if (message.includes('document status') || message.includes('my documents')) {
      const documentCount = documents.length;
      const documentTypes = documents.map(doc => doc.document_type).join(', ');
      
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `You have ${documentCount} documents uploaded: ${documentTypes || 'No documents found'}. I can help you organize them or check what's missing for specific applications.`,
        timestamp,
        suggestions: ['What documents do I need for passport?', 'Check missing documents', 'Upload new documents']
      };
    }

    // Passport queries
    if (message.includes('passport')) {
      const hasAadhar = documents.some(doc => 
        doc.document_type.toLowerCase().includes('aadhar') || 
        doc.document_name.toLowerCase().includes('aadhar')
      );
      const hasPAN = documents.some(doc => 
        doc.document_type.toLowerCase().includes('pan') || 
        doc.document_name.toLowerCase().includes('pan')
      );

      let response = `For passport application, you need:\n\n`;
      response += `✅ Required Documents:\n`;
      response += `• Aadhar Card ${hasAadhar ? '✅' : '❌'}\n`;
      response += `• PAN Card ${hasPAN ? '✅' : '❌'}\n`;
      response += `• Birth Certificate\n`;
      response += `• Address Proof\n`;
      response += `• Passport Size Photo\n`;
      response += `• Digital Signature\n\n`;
      response += `📋 Process: Fill form → Book appointment → Submit docs → Track status\n`;
      response += `⏱️ Timeline: 15-30 days\n`;
      response += `💰 Cost: ₹1,500 - ₹3,500`;

      return {
        id: Date.now().toString(),
        type: 'bot',
        content: response,
        timestamp,
        action: {
          type: 'navigate',
          data: { tab: 'checklist', purpose: 'passport' }
        },
        suggestions: ['Check my passport readiness', 'Upload missing documents', 'Book appointment']
      };
    }

    // Bank account guidance with Smart Checklist integration
    if (message.includes('bank account') || message.includes('bank documents') || message.includes('banking')) {
      const analysis = analyzeDocuments();
      const bankRequirements = {
        required: ['Aadhar Card', 'PAN Card', 'Address Proof', 'Income Proof', 'Photo'],
        optional: ['Employment Letter', 'Business Registration'],
        process: [
          'Choose bank and account type',
          'Fill application form',
          'Submit KYC documents',
          'Complete verification',
          'Activate account'
        ],
        timeline: '1-3 days',
        cost: '₹0 - ₹500'
      };

      const userHas = [];
      const userMissing = [];

      bankRequirements.required.forEach(doc => {
        if (doc === 'Aadhar Card' && analysis.hasAadhar) userHas.push('✅ Aadhar Card');
        else if (doc === 'PAN Card' && analysis.hasPan) userHas.push('✅ PAN Card');
        else if (doc === 'Address Proof' && analysis.hasAddressProof) userHas.push('✅ Address Proof');
        else if (doc === 'Income Proof' && analysis.hasIncomeProof) userHas.push('✅ Income Proof');
        else if (doc === 'Photo' && analysis.hasPhoto) userHas.push('✅ Photo');
        else userMissing.push(`❌ ${doc}`);
      });

      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `🏦 **Bank Account Documents Analysis:**\n\n**Your Current Status:**\n${userHas.join('\n')}\n${userMissing.join('\n')}\n\n**Required Documents:**\n${bankRequirements.required.map(doc => `• ${doc}`).join('\n')}\n\n**Optional Documents:**\n${bankRequirements.optional.map(doc => `• ${doc}`).join('\n')}\n\n**Application Process:**\n${bankRequirements.process.map(step => `• ${step}`).join('\n')}\n\n**Timeline:** ${bankRequirements.timeline}\n**Cost:** ${bankRequirements.cost}\n\n💡 **Tip:** Use the Smart Checklist tab to track your progress!`,
        timestamp,
        action: {
          type: 'navigate',
          data: { tab: 'checklist', purpose: 'bank_account' }
        }
      };
    }

    // Job application guidance with Smart Checklist integration
    if (message.includes('job application') || message.includes('job documents') || message.includes('sub documents for job') || message.includes('documents for job')) {
      const analysis = analyzeDocuments();
      const jobRequirements = {
        required: ['Resume/CV', 'Aadhar Card', 'PAN Card', 'Education Certificates', 'Photo'],
        optional: ['Experience Letters', 'Reference Letters', 'Portfolio'],
        process: [
          'Prepare updated resume',
          'Gather all certificates',
          'Get professional photos',
          'Submit application with documents'
        ],
        timeline: 'Immediate',
        cost: '₹0 - ₹500'
      };

      const userHas = [];
      const userMissing = [];

      jobRequirements.required.forEach(doc => {
        if (doc === 'Resume/CV' && analysis.hasEducation) userHas.push('✅ Resume/CV');
        else if (doc === 'Aadhar Card' && analysis.hasAadhar) userHas.push('✅ Aadhar Card');
        else if (doc === 'PAN Card' && analysis.hasPan) userHas.push('✅ PAN Card');
        else if (doc === 'Education Certificates' && analysis.hasEducation) userHas.push('✅ Education Certificates');
        else if (doc === 'Photo' && analysis.hasPhoto) userHas.push('✅ Photo');
        else userMissing.push(`❌ ${doc}`);
      });

      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `📋 **Job Application Documents Analysis:**\n\n**Your Current Status:**\n${userHas.join('\n')}\n${userMissing.join('\n')}\n\n**Required Documents:**\n${jobRequirements.required.map(doc => `• ${doc}`).join('\n')}\n\n**Optional Documents:**\n${jobRequirements.optional.map(doc => `• ${doc}`).join('\n')}\n\n**Application Process:**\n${jobRequirements.process.map(step => `• ${step}`).join('\n')}\n\n**Timeline:** ${jobRequirements.timeline}\n**Cost:** ${jobRequirements.cost}\n\n💡 **Tip:** Use the Smart Checklist tab to track your progress!`,
        timestamp,
        action: {
          type: 'navigate',
          data: { tab: 'checklist', purpose: 'job_application' }
        }
      };
    }

    // Driving license guidance with Smart Checklist integration
    if (message.includes('driving license') || message.includes('driving licence') || message.includes('license documents') || message.includes('licensee')) {
      const analysis = analyzeDocuments();
      const licenseRequirements = {
        required: ['Aadhar Card', 'Age Proof', 'Address Proof', 'Medical Certificate', 'Photo'],
        optional: ['Previous License', 'Training Certificate'],
        process: [
          'Apply online on Parivahan website',
          'Book slot for driving test',
          'Pass written and practical tests',
          'Submit documents',
          'Collect license'
        ],
        timeline: '7-15 days',
        cost: '₹200 - ₹500'
      };

      const userHas = [];
      const userMissing = [];

      licenseRequirements.required.forEach(doc => {
        if (doc === 'Aadhar Card' && analysis.hasAadhar) userHas.push('✅ Aadhar Card');
        else if (doc === 'Age Proof' && analysis.hasAgeProof) userHas.push('✅ Age Proof');
        else if (doc === 'Address Proof' && analysis.hasAddressProof) userHas.push('✅ Address Proof');
        else if (doc === 'Photo' && analysis.hasPhoto) userHas.push('✅ Photo');
        else userMissing.push(`❌ ${doc}`);
      });

      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `🚗 **Driving License Documents Analysis:**\n\n**Your Current Status:**\n${userHas.join('\n')}\n${userMissing.join('\n')}\n\n**Required Documents:**\n${licenseRequirements.required.map(doc => `• ${doc}`).join('\n')}\n\n**Optional Documents:**\n${licenseRequirements.optional.map(doc => `• ${doc}`).join('\n')}\n\n**Application Process:**\n${licenseRequirements.process.map(step => `• ${step}`).join('\n')}\n\n**Timeline:** ${licenseRequirements.timeline}\n**Cost:** ${licenseRequirements.cost}\n\n💡 **Tip:** Use the Smart Checklist tab to track your progress!`,
        timestamp,
        action: {
          type: 'navigate',
          data: { tab: 'checklist', purpose: 'driving_license' }
        }
      };
    }

    // Available applications
    if (message.includes('apply') || message.includes('applications available')) {
      const suggestions = [];
      if (documents.some(doc => doc.document_type.toLowerCase().includes('aadhar'))) {
        suggestions.push('Passport Application');
      }
      if (documents.some(doc => doc.document_type.toLowerCase().includes('pan'))) {
        suggestions.push('Bank Account Opening');
      }
      if (documents.some(doc => doc.document_type.toLowerCase().includes('education'))) {
        suggestions.push('Job Application');
      }

      let response = `Based on your documents, you can apply for:\n\n`;
      if (suggestions.length > 0) {
        response += suggestions.map(s => `• ${s}`).join('\n');
      } else {
        response += `• Passport Application\n• Bank Account\n• Driving License\n• Job Applications`;
      }
      response += `\n\nI can help you check the specific requirements for any of these!`;

      return {
        id: Date.now().toString(),
        type: 'bot',
        content: response,
        timestamp,
        suggestions: ['Passport requirements', 'Bank account documents', 'Job application help']
      };
    }

    // Upload help
    if (message.includes('upload') || message.includes('help')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `To upload documents:\n\n1. Go to the Documents tab\n2. Click "Upload Document"\n3. Select file from your device\n4. Choose document type\n5. Add description\n6. Click "Upload"\n\n💡 Tips:\n• Use clear, well-lit photos\n• Ensure all text is readable\n• Keep file size under 10MB\n• Supported formats: PDF, JPG, PNG`,
        timestamp,
        action: {
          type: 'navigate',
          data: { tab: 'documents' }
        },
        suggestions: ['Check document quality', 'What file formats are supported?', 'Troubleshoot upload issues']
      };
    }

    // General help
    if (message.includes('help') || message.includes('what can you do')) {
      return {
        id: Date.now().toString(),
        type: 'bot',
        content: `I can help you with:\n\n📋 Document Requirements\n• Check what documents you need for any application\n• Track your document status\n• Identify missing documents\n\n🎯 Application Guidance\n• Step-by-step application processes\n• Timeline and cost information\n• Government portal links\n\n📱 Smart Features\n• Document organization\n• Expiry reminders\n• Quick access to your documents\n\nWhat would you like to know?`,
        timestamp,
        suggestions: ['Document requirements', 'Application processes', 'Smart features']
      };
    }

    // Default response with better guidance
    return {
      id: Date.now().toString(),
      type: 'bot',
      content: `I understand you're asking about "${userMessage}". Let me help you with that! 

I can assist you with:
📋 **Document Requirements** - What documents you need for any application
🎯 **Application Guidance** - Step-by-step processes for government applications
📱 **Smart Features** - Document organization and tracking

Try asking me:
• "What documents do I need for passport?"
• "Driving license requirements"
• "Job application documents"
• "Check my document status"

What specific help do you need?`,
      timestamp,
      suggestions: ['Document requirements', 'Application help', 'Upload assistance']
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Try Gemini AI for complex queries, fallback to local logic
    try {
      if (inputValue.toLowerCase().includes('sub documents') || 
          inputValue.toLowerCase().includes('detailed') ||
          inputValue.toLowerCase().includes('explain') ||
          inputValue.toLowerCase().includes('driving license') ||
          inputValue.toLowerCase().includes('passport') ||
          inputValue.toLowerCase().includes('job application') ||
          inputValue.toLowerCase().includes('bank account')) {
        
        const aiResponse = await callGeminiAI(inputValue, {
          userDocuments: documents,
          analysis: analyzeDocuments()
        });
        
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: aiResponse,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botResponse]);
      } else {
        // Use local logic for simple queries
        const botResponse = generateBotResponse(inputValue);
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (error) {
      // Fallback to local logic if AI fails
      const botResponse = generateBotResponse(inputValue);
      setMessages(prev => [...prev, botResponse]);
    }
    
    setIsTyping(false);
  };

  const handleQuickAction = (query: string) => {
    setInputValue(query);
    handleSendMessage();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleActionClick = (action: any) => {
    if (action.type === 'navigate') {
      // This would trigger navigation in the parent component
      console.log('Navigate to:', action.data);
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[500px] shadow-2xl z-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bot className="h-5 w-5 text-primary" />
                Virtual Setu AI
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsOpen(false);
                  onClose?.();
                }}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex flex-col h-[420px]">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.type === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.type === 'bot' && (
                          <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-line">{message.content}</p>
                          {message.suggestions && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {message.suggestions.map((suggestion, index) => (
                                <Button
                                  key={index}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-6"
                                  onClick={() => handleSuggestionClick(suggestion)}
                                >
                                  {suggestion}
                                </Button>
                              ))}
                            </div>
                          )}
                          {message.action && (
                            <Button
                              variant="default"
                              size="sm"
                              className="mt-2 text-xs"
                              onClick={() => handleActionClick(message.action)}
                            >
                              {message.action.type === 'navigate' && 'Go to ' + message.action.data.tab}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Quick Actions */}
            <div className="p-3 border-t">
              <div className="flex flex-wrap gap-1 mb-3">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-6"
                    onClick={() => handleQuickAction(action.query)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me anything..."
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  size="icon"
                  className="h-8 w-8"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
