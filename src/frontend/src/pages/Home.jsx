import React, { useState, useEffect, useRef } from 'react';
import backgroundImage from '../images/background.jpeg';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import StoreMap from '../components/StoreMap';

const BACKEND_URL = ' https://finn-agent-709365199670.us-central1.run.app';

// Fix Leaflet's default icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

L.Marker.prototype.options.icon = DefaultIcon;

function enforceProductListFormat(text) {
  if (
    text &&
    !text.startsWith("Here are some products:") &&
    (text.includes("* ") || text.includes("• Product:"))
  ) {
    let lines = text.split("\n").filter(line => line.trim());
    // Remove any intro line
    lines = lines.filter(line =>
      !/^we have|^here are|^the following|^which would|^do you want|^would you like/i.test(line.trim())
    );
    // Remove trailing questions or summaries
    lines = lines.filter(line =>
      !/would you like|which would you like|let me know|do you want more details/i.test(line.trim())
    );
    // Convert * or - to • Product: and remove markdown
    lines = lines.map(line => {
      if (line.startsWith("* ")) {
        // Remove markdown bold/italics
        let clean = line.replace(/\*\*/g, "").replace(/\*/g, "");
        // Try to extract product name and description
        const match = clean.match(/^\s*([^.]+?)[:：.\\-]+ ?(.+)$/i);
        if (match) {
          const name = match[1].trim();
          const desc = match[2].trim();
          return `• Product: ${name}\n${desc}`;
        }
        // Fallback: just replace * with bullet
        return clean.replace(/^\* /, "• Product: ");
      }
      if (line.startsWith("- ")) {
        return line.replace(/^- /, "• Product: ");
      }
      return line;
    });
    // Prepend the required header
    return "Here are some products:\n" + lines.join("\n");
  }
  return text;
}

const Home = ({ idToken, setIdToken }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Add a ref for the messages container
  const messagesEndRef = useRef(null);

  // Add scroll to bottom effect
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]); // This will trigger whenever messages array changes

  useEffect(() => {
    if (isChatOpen && messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: "Welcome to GenAI Sports! I'm Finn, your AI Sport Shopping Assistant. How can I help you today?"
        }
      ]);
    }
  }, [isChatOpen, messages.length]);

  const formatMessage = (text) => {
    // Trigger enforcement if the message starts with or contains a product list intro
    if (
      /^we have|^here are|^the following/i.test(text.trim()) ||
      text.includes("• Product:") ||
      text.split("\n").some(line => /^\*\s+/.test(line.trim()))
    ) {
      text = enforceProductListFormat(text);
    }

    if (text.includes('Here are some products:')) {
      const lines = text.split('\n').filter(line => line.trim());
      
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {lines.map((line, index) => {
            if (line.includes('Here are some products:')) {
              return <div key={index} style={{ 
                fontSize: '24px',
                fontWeight: '600'
              }}>{line}</div>;
            }
            
            if (line.startsWith('• Product:')) {
              const productName = line.split('Product:')[1].trim();
              const nextLine = lines[index + 1];
              const imageName = nextLine?.startsWith('Image:') 
                ? nextLine.split('Image:')[1].trim()
                : productName;
              
              const description = lines[index + 2] && !lines[index + 2].startsWith('• ') 
                ? lines[index + 2] 
                : '';
              
              const imageUrl = `${BACKEND_URL}/images/${encodeURIComponent(imageName)}.png`;
            
              return (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start',
                  gap: '32px',
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '8px',
                  border: '1px solid #eee'
                }}>
                  <img 
                    src={imageUrl}
                    alt={productName}
                    onClick={() => setSelectedImage(imageUrl)}
                    style={{ 
                      width: '300px',
                      height: '300px',
                      objectFit: 'contain',
                      cursor: 'pointer',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      padding: '8px'
                    }}
                  />
                  <div style={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    <div style={{ 
                      fontSize: '28px',
                      fontWeight: '600',
                      color: '#111827'
                    }}>
                      {productName}
                    </div>
                    {description && (
                      <div style={{ 
                        fontSize: '20px',
                        lineHeight: '1.5',
                        color: '#4b5563'
                      }}>
                        {description}
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          }).filter(Boolean)}
        </div>
      );
    }
    
    // Check if the message contains store locations
    if (text.includes('USER|')) {
      const lines = text.trim().split('\n');
      const stores = [];
      let userLocation;

      lines.forEach(line => {
        try {
          const [name, coordinates] = line.split('|');
          if (!coordinates) return;

          const [distance, longitude, latitude] = coordinates.split(',').map(Number);

          if (isNaN(latitude) || isNaN(longitude)) {
            console.error('Invalid coordinates:', { latitude, longitude });
            return;
          }

          if (name.trim() === 'USER') {
            userLocation = {
              lat: latitude,
              lng: longitude
            };
          } else {
            stores.push({
              name: name.trim(),
              distance,
              latitude,
              longitude
            });
          }
        } catch (err) {
          console.error('Error processing line:', line, err);
        }
      });

      return (
        <div className="map-container" style={{ height: '400px', width: '100%', margin: '10px 0' }}>
          <StoreMap 
            stores={stores}
            userLocation={userLocation}
          />
        </div>
      );
    }
    
    return <span style={{ whiteSpace: 'pre-line' }}>{text}</span>;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    if (!idToken) {
      alert("Please sign in with Google first!");
      return;
    }

    const userMessage = {
      role: 'user',
      content: inputMessage.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      let aiText = "";
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: aiText
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const ImageModal = ({ imageUrl, onClose }) => (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        cursor: 'pointer'
      }}
      onClick={onClose}
    >
      <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
        <img 
          src={imageUrl}
          alt="Large product view"
          style={{
            maxWidth: '100%',
            maxHeight: '90vh',
            objectFit: 'contain',
            borderRadius: '8px',
            backgroundColor: 'white',
            padding: '10px'
          }}
        />
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '30px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      overflow: 'hidden'
    }}>
      {/* Full screen hero background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'url(https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=1600&q=80) center/cover',
        backgroundPosition: 'center',
        backgroundSize: 'cover'
      }}>
        {/* Dark overlay for better text readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.5) 100%)'
        }} />
      </div>
      
      {/* Main Text Overlay - Centered */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        width: '100%',
        maxWidth: '900px',
        padding: '0 2rem',
        zIndex: 2
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          padding: '8px 20px',
          borderRadius: '50px',
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.3)'
        }}>
          <span className="material-icons" style={{ color: 'white', fontSize: '20px' }}>
            smart_toy
          </span>
          <span style={{ color: 'white', fontWeight: '500', fontSize: '0.9rem', letterSpacing: '0.5px' }}>
            AI Shopping Assistant
          </span>
        </div>
        
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: '700',
          color: 'white',
          marginBottom: '1.5rem',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
          lineHeight: '1.2',
          letterSpacing: '-0.02em'
        }}>
          Your Personal Sports Shopping Assistant
        </h1>
        <p style={{
          fontSize: '1.15rem',
          color: 'rgba(255, 255, 255, 0.85)',
          marginBottom: '2.5rem',
          lineHeight: '1.6',
          maxWidth: '600px',
          margin: '0 auto 2.5rem',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
          fontWeight: '400'
        }}>
          Chat with Finn, our AI assistant, to find the perfect sports gear. 
          Get personalized recommendations, product details, and more.
        </p>
        <button 
          onClick={() => setIsChatOpen(true)}
          style={{
            background: 'white',
            color: '#1f2937',
            padding: '1rem 2.5rem',
            borderRadius: '50px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.1rem',
            fontWeight: '600',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.3s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.3)';
            e.currentTarget.style.background = '#f9fafb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
            e.currentTarget.style.background = 'white';
          }}
        >
          <span className="material-icons">chat</span>
          Start Shopping
        </button>
      </div>

      {/* Bottom badge */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        color: 'white',
        fontSize: '0.95rem',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        padding: '12px 20px',
        borderRadius: '50px',
        zIndex: 2,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        fontWeight: '500'
      }}>
        Powered by <span style={{ 
          fontWeight: 'bold'
        }}>AlloyDB</span> & AI
      </div>

      {/* Centered Chat Overlay */}
      {isChatOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-in'
        }}>
            <div style={{
              width: '1536px',
              height: '85vh',
              maxHeight: '900px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.95) 100%)',
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              animation: 'slideIn 0.4s ease-out'
            }}>
              {/* Updated Chat Header with gradient */}
              <div style={{
                padding: '24px 32px',
                borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#1f2937'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <span className="material-icons" style={{ 
                      color: 'white',
                      fontSize: '28px'
                    }}>
                      support_agent
                    </span>
                  </div>
                  <div>
                    <h3 style={{ 
                      margin: 0,
                      fontWeight: '700',
                      fontSize: '1.6rem',
                      color: 'white',
                      letterSpacing: '-0.02em'
                    }}>
                      Finn - AI Shopping Assistant
                    </h3>
                    <p style={{
                      margin: 0,
                      fontSize: '0.9rem',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontWeight: '400'
                    }}>
                      Online • Ready to help you find the perfect gear
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  style={{
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    cursor: 'pointer',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.5rem',
                    transition: 'all 0.2s ease',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>
              </div>
              
              {/* Chat Content - Add ref for scrolling */}
              <div style={{
                flex: 1,
                padding: '32px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                background: 'rgba(249, 250, 251, 0.5)'
              }}>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    style={{
                      alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '70%',
                      padding: '18px 24px',
                      borderRadius: '16px',
                      background: message.role === 'user' 
                        ? 'linear-gradient(135deg, #1f2937 0%, #764ba2 100%)' 
                        : 'white',
                      color: message.role === 'user' ? 'white' : '#1f2937',
                      fontSize: '24px',
                      boxShadow: message.role === 'user' 
                        ? '0 4px 12px rgba(102, 126, 234, 0.4)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.08)',
                      animation: 'slideIn 0.3s ease-out'
                    }}
                  >
                    {message.role === 'user' ? (
                      message.content
                    ) : (
                      <div>
                        {(() => {
                          try {
                            // Handle shopping list format
                            if (message.content.includes('shopping list:')) {
                              const lines = message.content.split('\n');
                              const items = lines.reduce((acc, line, index) => {
                                if (line.includes('• Product:')) {
                                  const item = {};
                                  // Get the product name
                                  item.name = line.substring(line.indexOf('• Product:') + '• Product:'.length).trim();
                                  
                                  // Look ahead for details until next product or end
                                  let currentIndex = index + 1;
                                  while (currentIndex < lines.length && !lines[currentIndex].includes('• Product:')) {
                                    const detailLine = lines[currentIndex].trim();
                                    if (detailLine) {
                                      const [key, ...valueParts] = detailLine.split(':').map(s => s.trim());
                                      const value = valueParts.join(':').trim(); // Rejoin in case value contains colons
                                      if (key && value) {
                                        const cleanKey = key.toLowerCase();
                                        item[cleanKey] = value;
                                      }
                                    }
                                    currentIndex++;
                                  }
                                  acc.push(item);
                                }
                                return acc;
                              }, []);

                              return (
                                <div style={{
                                  backgroundColor: 'white',
                                  borderRadius: '8px',
                                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                  overflow: 'hidden'
                                }}>
                                  {/* Shopping List Header */}
                                  <div style={{
                                    padding: '16px',
                                    borderBottom: '1px solid #e5e7eb',
                                    backgroundColor: '#f8fafc'
                                  }}>
                                    <h2 style={{
                                      fontSize: '24px',
                                      fontWeight: '600',
                                      color: '#111827',
                                      margin: 0
                                    }}>
                                      Your Shopping List
                                    </h2>
                                  </div>

                                  {/* Shopping List Items */}
                                  <div>
                                    {items.map((item, index) => (
                                      <div key={index} style={{
                                        padding: '24px',
                                        borderBottom: index < items.length - 1 ? '1px solid #e5e7eb' : 'none',
                                        display: 'flex',
                                        gap: '32px',
                                        alignItems: 'flex-start'
                                      }}>
                                        {/* Product Image */}
                                        <div style={{
                                          width: '300px',
                                          height: '300px',
                                          flexShrink: 0,
                                          backgroundColor: 'white',
                                          borderRadius: '4px',
                                          padding: '8px',
                                          border: '1px solid #e5e7eb'
                                        }}>
                                          <img
                                            src={`${BACKEND_URL}/images/${encodeURIComponent(item.name)}.png`}
                                            alt={item.name}
                                            onClick={() => setSelectedImage(`${BACKEND_URL}/images/${encodeURIComponent(item.name)}.png`)}
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'contain',
                                              cursor: 'pointer'
                                            }}
                                          />
                                        </div>

                                        {/* Product Details */}
                                        <div style={{
                                          flex: 1,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '16px'
                                        }}>
                                          <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start'
                                          }}>
                                            <div>
                                              <h3 style={{
                                                fontSize: '24px',
                                                fontWeight: '600',
                                                color: '#111827',
                                                margin: 0,
                                                marginBottom: '4px'
                                              }}>
                                                {item.name}
                                              </h3>
                                              <p style={{
                                                fontSize: '18px',
                                                color: '#6b7280',
                                                margin: 0
                                              }}>
                                                {item.brand}
                                              </p>
                                            </div>
                                            <div style={{
                                              fontSize: '24px',
                                              fontWeight: '600',
                                              color: '#2563eb'
                                            }}>
                                              {item.price}
                                            </div>
                                          </div>

                                          <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                            gap: '16px',
                                            fontSize: '16px',
                                            color: '#4b5563'
                                          }}>
                                            <div>
                                              <span style={{ fontWeight: '500' }}>Category: </span>
                                              {item.category}
                                            </div>
                                            <div>
                                              <span style={{ fontWeight: '500' }}>Size: </span>
                                              {item.size}
                                            </div>
                                            <div>
                                              <span style={{ fontWeight: '500' }}>Color: </span>
                                              {item.color}
                                            </div>
                                            <div>
                                              <span style={{ fontWeight: '500' }}>Quantity: </span>
                                              {item.quantity}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Shopping List Footer */}
                                  <div style={{
                                    padding: '24px',
                                    borderTop: '1px solid #e5e7eb',
                                    backgroundColor: '#f8fafc',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <div style={{
                                      fontSize: '16px',
                                      color: '#6b7280'
                                    }}>
                                      {items.length} {items.length === 1 ? 'item' : 'items'} in your list
                                    </div>
                                    <div style={{
                                      fontSize: '24px',
                                      fontWeight: '600',
                                      color: '#111827'
                                    }}>
                                      Total: <span style={{ color: '#059669' }}>{
                                        items.reduce((sum, item) => {
                                          const price = parseFloat(item.price.replace('€', ''));
                                          const quantity = parseInt(item.quantity);
                                          return sum + (price * quantity);
                                        }, 0).toLocaleString('en-US', { style: 'currency', currency: 'EUR' })
                                      }</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            
                            // Handle product details format
                            if (message.content.includes('• Product Name:')) {
                              const lines = message.content.split('\n');
                              const details = {};
                              
                              // Parse product details
                              for (const line of lines) {
                                if (line.startsWith('•')) {
                                  const [key, value] = line.substring(1).split(':').map(s => s.trim());
                                  if (key && value) {
                                    details[key] = value;
                                  }
                                }
                              }

                              return (
                                <div style={{
                                  backgroundColor: 'white',
                                  borderRadius: '8px',
                                  padding: '24px',
                                  margin: '8px 0'
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    gap: '32px',
                                    alignItems: 'flex-start'
                                  }}>
                                    {/* Left side - Product Image */}
                                    <img 
                                      src={`${BACKEND_URL}/images/${encodeURIComponent(details['Product Name'])}.png`}
                                      alt={details['Product Name']}
                                      onClick={() => setSelectedImage(`${BACKEND_URL}/images/${encodeURIComponent(details['Product Name'])}.png`)}
                                      style={{
                                        width: '300px',    // Increased size
                                        height: '300px',   // Increased size
                                        objectFit: 'contain',
                                        cursor: 'pointer',
                                        backgroundColor: 'white',
                                        borderRadius: '4px',
                                        padding: '8px'
                                      }}
                                    />

                                    {/* Right side - Product Details */}
                                    <div style={{ 
                                      flex: 1,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '16px'
                                    }}>
                                        <h3 style={{
                                        fontSize: '24px',
                                        fontWeight: '600',
                                        margin: '0'
                                        }}>{details['Product Name']}</h3>

                                        <div style={{
                                        fontSize: '24px',
                                          color: '#2563eb',
                                          fontWeight: '600'
                                        }}>{details['Price']}</div>

                                      <div style={{ 
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                      }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                          <div style={{ width: '100px', fontWeight: '500' }}>Brand:</div>
                                        <div>{details['Brand']}</div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                          <div style={{ width: '100px', fontWeight: '500' }}>Category:</div>
                                        <div>{details['Category']}</div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontWeight: '500' }}>Sizes:</div>
                                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                          {details['Sizes'].split(',').map(size => (
                                            <span key={size} style={{
                                                padding: '8px 16px',
                                              backgroundColor: '#f3f4f6',
                                              borderRadius: '4px',
                                                fontSize: '16px'
                                            }}>
                                              {size.trim()}
                                            </span>
                                          ))}
                                          </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontWeight: '500' }}>Colors:</div>
                                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                          {details['Colors'].split(',').map(color => (
                                            <span key={color} style={{
                                                padding: '8px 16px',
                                              backgroundColor: '#f3f4f6',
                                              borderRadius: '4px',
                                                fontSize: '16px'
                                            }}>
                                              {color.trim()}
                                            </span>
                                          ))}
                                        </div>
                                      </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          <div style={{ fontWeight: '500' }}>Description:</div>
                                        <div style={{
                                            fontSize: '16px',
                                          lineHeight: '1.5',
                                          color: '#4b5563'
                                        }}>
                                          {details['Description']}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // Handle product list format
                            if (message.content.includes('Here are some products:')) {
                              const lines = message.content.split('\n').filter(line => line.trim());
                              
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                  {lines.map((line, index) => {
                                    if (line.includes('Here are some products:')) {
                                      return <div key={index} style={{ 
                                        fontSize: '24px',
                                        fontWeight: '600'
                                      }}>{line}</div>;
                                    }
                                    
                                    if (line.startsWith('• Product:')) {
                                      const productName = line.split('Product:')[1].trim();
                                      const nextLine = lines[index + 1];
                                      const imageName = nextLine?.startsWith('Image:') 
                                        ? nextLine.split('Image:')[1].trim()
                                        : productName;
                                      
                                      const description = lines[index + 2] && !lines[index + 2].startsWith('• ') 
                                        ? lines[index + 2] 
                                        : '';
                                      
                                      const imageUrl = `${BACKEND_URL}/images/${encodeURIComponent(imageName)}.png`;
                                      
                                      return (
                                        <div key={index} style={{ 
                                          display: 'flex', 
                                          alignItems: 'flex-start',
                                          gap: '32px',
                                          backgroundColor: 'white',
                                          padding: '24px',
                                          borderRadius: '8px',
                                          border: '1px solid #eee'
                                        }}>
                                          <img 
                                            src={imageUrl}
                                            alt={productName}
                                            onClick={() => setSelectedImage(imageUrl)}
                                            style={{ 
                                              width: '300px',
                                              height: '300px',
                                              objectFit: 'contain',
                                              cursor: 'pointer',
                                              backgroundColor: 'white',
                                              borderRadius: '4px',
                                              padding: '8px'
                                            }}
                                          />
                                          <div style={{ 
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '16px'
                                          }}>
                                            <div style={{ 
                                              fontSize: '28px',
                                              fontWeight: '600',
                                              color: '#111827'
                                            }}>
                                              {productName}
                                            </div>
                                            {description && (
                                              <div style={{ 
                                                fontSize: '20px',
                                                lineHeight: '1.5',
                                                color: '#4b5563'
                                              }}>
                                                {description}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }).filter(Boolean)}
                                </div>
                              );
                            }

                            // Handle delivery methods format
                            if (message.content.includes('• ') && message.content.includes('Description:') && message.content.includes('Cost:')) {
                              const methods = message.content.split('\n\n').filter(method => method.trim());
                              
                            return (
                                <div style={{
                                  backgroundColor: 'white',
                                  borderRadius: '8px',
                                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                  overflow: 'hidden'
                                }}>
                              <div style={{
                                padding: '16px',
                                    borderBottom: '1px solid #e5e7eb',
                                    backgroundColor: '#f8fafc'
                                  }}>
                                    <h2 style={{
                                      fontSize: '18px',
                                      fontWeight: '600',
                                      color: '#111827',
                                      margin: 0
                                    }}>
                                      Available Delivery Methods
                                    </h2>
                                  </div>
                                  
                                  <div style={{
                                    padding: '16px'
                                  }}>
                                    <div style={{
                                      display: 'grid',
                                      gap: '12px'
                                    }}>
                                      {methods.map((method, index) => {
                                        const lines = method.split('\n');
                                        const name = lines[0].substring(2); // Remove bullet point
                                        const description = lines[1].split('Description:')[1].trim();
                                        const cost = lines[2].split('Cost:')[1].trim();
                                        const estimatedTime = lines[3].split('Estimated Delivery Time:')[1].trim();
                                        
                                        return (
                                          <div key={index} style={{
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '6px',
                                            overflow: 'hidden'
                                          }}>
                                            <div style={{
                                              padding: '12px 16px',
                                              backgroundColor: '#f8fafc',
                                              borderBottom: '1px solid #e5e7eb'
                                            }}>
                                              <div style={{
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                color: '#111827'
                                              }}>
                                                {name}
                                              </div>
                                            </div>
                                            
                                            <div style={{
                                              padding: '12px 16px'
                                            }}>
                                              <table style={{
                                                width: '100%',
                                                borderCollapse: 'collapse'
                                              }}>
                                                <tbody>
                                                  <tr>
                                                    <td style={{
                                                      padding: '8px 0',
                                                      color: '#4b5563',
                                                      width: '40%',
                                                      fontWeight: '500'
                                                    }}>
                                                      Description:
                                                    </td>
                                                    <td style={{
                                                      padding: '8px 0',
                                                      color: '#111827'
                                                    }}>
                                                      {description}
                                                    </td>
                                                  </tr>
                                                  <tr>
                                                    <td style={{
                                                      padding: '8px 0',
                                                      color: '#4b5563',
                                                      fontWeight: '500'
                                                    }}>
                                                      Cost:
                                                    </td>
                                                    <td style={{
                                                      padding: '8px 0',
                                                      color: '#059669',
                                                      fontWeight: '500'
                                                    }}>
                                                      {cost}
                                                    </td>
                                                  </tr>
                                                  <tr>
                                                    <td style={{
                                                      padding: '8px 0',
                                                      color: '#4b5563',
                                                      fontWeight: '500'
                                                    }}>
                                                      Estimated Time:
                                                    </td>
                                                    <td style={{
                                                      padding: '8px 0',
                                                      color: '#111827'
                                                    }}>
                                                      {estimatedTime}
                                                    </td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            // Handle order format
                            if (message.content.includes('Order:')) {
                              const lines = message.content.split('\n');
                              const orderDetails = {};
                              const items = [];
                              let deliveryMethod = null;
                              let deliveryCost = null;
                              
                              lines.forEach(line => {
                                // Skip empty lines and the "Delivery Method:" label
                                if (!line.trim() || line.trim() === 'Delivery Method:') {
                                  return;
                                }

                                if (line.startsWith('• Order:')) {
                                  orderDetails.number = line.substring(8).trim();
                                } else if (line.startsWith('Store:')) {
                                  orderDetails.store = line.substring(6).trim();
                                } else if (line.startsWith('Total Amount:')) {
                                  orderDetails.totalAmount = line.substring(13).trim();
                                } else if (line.startsWith('Status:')) {
                                  orderDetails.status = line.substring(7).trim();
                                } else if (line.startsWith('Shipping Address:')) {
                                  orderDetails.shippingAddress = line.substring(17).trim();
                                } else if (line.startsWith('-')) {
                                  if (line.includes('Delivery')) {
                                    // Parse delivery method line
                                    const parts = line.substring(2).split('€');
                                    deliveryMethod = parts[0].trim();
                                    deliveryCost = '€' + parts[1].trim();
                                  } else {
                                    // Parse item line
                                    const itemLine = line.substring(1).trim();
                                    items.push(itemLine);
                                  }
                                }
                              });

                              return (
                                <div style={{
                                  backgroundColor: 'white',
                                  borderRadius: '8px',
                                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                  overflow: 'hidden'
                                }}>
                                  {/* Order Header */}
                                  <div style={{
                                    padding: '16px',
                                    borderBottom: '1px solid #e5e7eb',
                                    backgroundColor: '#f8fafc',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <h2 style={{
                                      fontSize: '22px',
                                      fontWeight: '600',
                                      color: '#111827',
                                      margin: 0
                                    }}>
                                      Order {orderDetails.number}
                                    </h2>
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '14px',
                                      backgroundColor: orderDetails.status.toLowerCase() === 'pending' ? '#fef3c7' : '#d1fae5',
                                      color: orderDetails.status.toLowerCase() === 'pending' ? '#92400e' : '#065f46'
                                    }}>
                                      {orderDetails.status}
                                    </span>
                                  </div>

                                  {/* Order Details */}
                                  <div style={{ padding: '16px' }}>
                                    <div style={{
                                      display: 'grid',
                                      gap: '16px'
                                    }}>
                                      {/* Store with same format as shipping and delivery */}
                                      <div style={{
                                        fontSize: '18px',
                                        color: '#4b5563'
                                      }}>
                                        <span style={{ 
                                          fontWeight: '600',
                                          color: '#111827'
                                        }}>
                                          Store:
                                        </span>
                                        {' '}{orderDetails.store}
                                      </div>

                                      {/* Shipping Address with bold label */}
                                      <div style={{
                                        fontSize: '18px',
                                        color: '#4b5563'
                                      }}>
                                        <span style={{ 
                                          fontWeight: '600',
                                          color: '#111827'
                                        }}>
                                          Shipping Address:
                                        </span>
                                        {' '}{orderDetails.shippingAddress}
                                      </div>

                                      {/* Items Section */}
                                      <div>
                                        <h3 style={{
                                          fontSize: '16px',
                                          fontWeight: '600',
                                          color: '#111827',
                                          marginBottom: '12px'
                                        }}>
                                          Items
                                        </h3>
                                        <div style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '8px'
                                        }}>
                                          {items.map((item, index) => {
                                            const priceIndex = item.lastIndexOf('€');
                                            const itemDetails = item.substring(0, priceIndex);
                                            const price = item.substring(priceIndex);
                                            
                                            return (
                                              <div key={index} style={{
                                                padding: '12px',
                                                backgroundColor: '#f9fafb',
                                                borderRadius: '6px',
                                                fontSize: '18px',
                                                color: '#374151',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                              }}>
                                                <span>{itemDetails}</span>
                                                <span style={{
                                                  color: '#059669',
                                                  fontWeight: '500'
                                                }}>
                                                  {price}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Delivery Method Section */}
                                      {deliveryMethod && (
                                        <div>
                                          <h3 style={{
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            color: '#111827',
                                            marginBottom: '12px'
                                          }}>
                                            Delivery Method
                                          </h3>
                                          <div style={{
                                            padding: '12px',
                                            backgroundColor: '#f9fafb',
                                            borderRadius: '6px',
                                            fontSize: '18px',
                                            color: '#374151',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                          }}>
                                            <span>{deliveryMethod}</span>
                                            <span style={{
                                              color: '#059669',
                                              fontWeight: '500'
                                            }}>
                                              {deliveryCost}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* Total Amount at the bottom with bold black label and green amount */}
                                      <div style={{
                                        borderTop: '1px solid #e5e7eb',
                                        paddingTop: '16px',
                                        marginTop: '8px',
                                        fontSize: '18px',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}>
                                        <span style={{ 
                                          fontWeight: '600',
                                          color: '#111827'  // Black color for the label
                                        }}>
                                          Total Amount:
                                        </span>
                                        <span style={{
                                          marginLeft: '8px',
                                          color: '#059669',  // Green color for the amount
                                          fontWeight: '600'
                                        }}>
                                          {orderDetails.totalAmount}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                              </div>
                            );
                            }

                            // Handle store locations format
                            if (message.content.includes('|') && message.content.includes(',')) {
                              try {
                                console.log('Raw message:', message.content);

                                const locations = message.content.split('\n').filter(line => line.trim());
                                const stores = [];
                                
                                let userLocation;

                                locations.forEach(location => {
                                  try {
                                    const [name, coords] = location.split('|');
                                    if (!coords) return;

                                    const [distance, lat, lon] = coords.split(',');
                                    
                                    // Ensure we have valid numbers
                                    const parsedLat = parseFloat(lat);
                                    const parsedLon = parseFloat(lon);
                                    const parsedDistance = parseFloat(distance);

                                    if (isNaN(parsedLat) || isNaN(parsedLon)) {
                                      console.error('Invalid coordinates:', { lat, lon });
                                      return;
                                    }

                                    if (name.startsWith('USER')) {
                                      userLocation = {
                                        latitude: parsedLat,
                                        longitude: parsedLon
                                      };
                                      console.log('User location set:', userLocation);
                                    } else {
                                      if (!isNaN(parsedDistance)) {
                                        stores.push({
                                          name: name.trim(),
                                          distance: parsedDistance,
                                          latitude: parsedLat,
                                          longitude: parsedLon
                                        });
                                        console.log('Store added:', stores[stores.length - 1]);
                                      }
                                    }
                                  } catch (err) {
                                    console.error('Error processing location:', location, err);
                                  }
                                });

                                console.log('Final data:', { stores, userLocation });

                                // Only render map if we have valid data
                                if (stores.length === 0) {
                                  return <div>No stores found</div>;
                                }

                                // Default center (Barcelona) if no user location
                                const defaultCenter = [41.3851, 2.1734];
                                const mapCenter = userLocation 
                                  ? [userLocation.latitude, userLocation.longitude]
                                  : defaultCenter;

                                return (
                                  <div style={{
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                    margin: '8px 0',
                                    width: '300%',
                                    marginLeft: '-100%',
                                    transform: 'translateX(33%)',
                                    backgroundColor: 'white'
                                  }}>
                                    <div style={{
                                      padding: '24px',
                                      borderBottom: '1px solid #e5e7eb'
                                    }}>
                                      <h2 style={{
                                        fontSize: '28px',
                                        fontWeight: '600',
                                        color: '#111827',
                                        margin: 0
                                      }}>
                                        Nearby Stores
                                      </h2>
                                    </div>

                                    {/* Flex container for side-by-side layout */}
                                    <div style={{
                                      display: 'flex',
                                      width: '100%',
                                      backgroundColor: 'white'
                                    }}>
                                      {/* First column - Map */}
                                      <div style={{ 
                                        width: '70%',
                                        height: '600px',
                                        borderRight: '1px solid #e5e7eb',
                                        backgroundColor: 'white'
                                      }}>
                                        <MapContainer
                                          key={`map-${stores.length}`}
                                          center={mapCenter}
                                          zoom={13}
                                          style={{ 
                                            height: '100%',
                                            width: '100%',
                                            zIndex: 1
                                          }}
                                        >
                                          <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                          />

                                          {userLocation && (
                                            <Marker 
                                              position={[userLocation.latitude, userLocation.longitude]}
                                              icon={new L.Icon({
                                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                                                iconSize: [25, 41],
                                                iconAnchor: [12, 41],
                                                popupAnchor: [1, -34],
                                              })}
                                            >
                                              <Popup>Your Location</Popup>
                                            </Marker>
                                          )}

                                          {stores.map((store, index) => (
                                            <Marker 
                                              key={`store-${index}`}
                                              position={[store.latitude, store.longitude]}
                                              icon={new L.Icon({
                                                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                                                iconSize: [25, 41],
                                                iconAnchor: [12, 41],
                                                popupAnchor: [1, -34],
                                              })}
                                            >
                                              <Popup>
                                                <div style={{ fontWeight: 500 }}>{store.name}</div>
                                                <div style={{ fontSize: '18px', color: '#6b7280' }}>
                                                  {(store.distance / 1000).toFixed(1)}km away
                                                </div>
                                              </Popup>
                                            </Marker>
                                          ))}
                                        </MapContainer>
                                      </div>

                                      {/* Second column - Store list */}
                                      <div style={{ 
                                        width: '30%',
                                        padding: '24px',
                                        backgroundColor: '#f9fafb'
                                      }}>
                                        {stores.map((store, index) => (
                                          <div
                                            key={index}
                                            style={{
                                              padding: '20px',
                                              backgroundColor: 'white',
                                              borderRadius: '8px',
                                              marginBottom: '16px',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s ease'
                                            }}
                                          >
                                            <div style={{ 
                                              fontSize: '18px',
                                              fontWeight: '600',
                                              color: '#111827',
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis'
                                            }}>
                                              {store.name}
                                            </div>
                                            <div style={{ 
                                              fontSize: '16px',
                                              color: '#6b7280',
                                              marginTop: '4px'
                                            }}>
                                              {(store.distance / 1000).toFixed(1)}km away
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              } catch (error) {
                                console.error('Error rendering map:', error);
                                return (
                                  <div style={{
                                    padding: '16px',
                                    backgroundColor: 'white',
                                    borderRadius: '8px'
                                  }}>
                                    <p>Error loading store locations. Please try again.</p>
                                  </div>
                                );
                              }
                            }

                            // Handle other message types
                            return message.content.split('\n').map((line, i) => (
                              <div key={i}>{line}</div>
                            ));
                          } catch (error) {
                            console.error('Error processing message:', error);
                            return <div>Error displaying message</div>;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Add invisible div at the bottom */}
                <div ref={messagesEndRef} />
                
                {isLoading && (
                  <div style={{
                    alignSelf: 'flex-start',
                    padding: '18px 24px',
                    borderRadius: '16px',
                    background: 'white',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#1f2937',
                      animation: 'pulse 1.4s ease-in-out infinite'
                    }} />
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#1f2937',
                      animation: 'pulse 1.4s ease-in-out 0.2s infinite'
                    }} />
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#1f2937',
                      animation: 'pulse 1.4s ease-in-out 0.4s infinite'
                    }} />
                  </div>
                )}
              </div>
              
              {/* Updated Input Section with gradient accents */}
              <div style={{
                padding: '24px 32px',
                borderTop: '1px solid rgba(102, 126, 234, 0.1)',
                background: 'white'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'center'
                }}>
                  <input 
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    style={{
                      flex: 1,
                      padding: '16px 24px',
                      borderRadius: '50px',
                      border: '2px solid rgba(102, 126, 234, 0.2)',
                      fontSize: '1rem',
                      outline: 'none',
                      backgroundColor: '#f9fafb',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1f2937';
                      e.target.style.backgroundColor = 'white';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(102, 126, 234, 0.2)';
                      e.target.style.backgroundColor = '#f9fafb';
                    }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    style={{
                      background: isLoading || !inputMessage.trim() 
                        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.5) 0%, rgba(118, 75, 162, 0.5) 100%)' 
                        : 'linear-gradient(135deg, #1f2937 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '56px',
                      height: '56px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading && inputMessage.trim()) {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: '24px' }}>
                      send
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add the image modal */}
        {selectedImage && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
            }}
            onClick={() => setSelectedImage(null)}
          >
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setSelectedImage(null)}
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '30px',
                  cursor: 'pointer',
                  padding: '10px',
                  zIndex: 10000
                }}
              >
                ×
              </button>
              <img 
                src={selectedImage}
                alt="Enlarged view"
                style={{
                  maxWidth: '90%',
                  maxHeight: '90%',
                  objectFit: 'contain',
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px'
                }}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      )}
    </div>
  );
};

export default Home; 
