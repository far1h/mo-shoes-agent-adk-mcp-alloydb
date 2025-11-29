import React from 'react';
import { Link } from 'react-router-dom';
import GoogleSignInButton from '../GoogleSignInButton';

const Header = ({ idToken, setIdToken }) => {
  const handleSignOut = () => {
    setIdToken(null);
    // Clear any stored tokens
    localStorage.removeItem('idToken');
  };

  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      padding: '1.25rem 2rem',
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(20px)',
      boxShadow: 'none',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      alignItems: 'center',
      gap: '2rem',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100
    }}>
      {/* Left: Categories */}
      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.95rem', fontWeight: '500' }}>
        <Link to="/" style={{ color: 'rgba(255, 255, 255, 0.9)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'white'} onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.9)'}>Hike & Camp</Link>
        <Link to="/" style={{ color: 'rgba(255, 255, 255, 0.9)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'white'} onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.9)'}>Cycling</Link>
        <Link to="/" style={{ color: 'rgba(255, 255, 255, 0.9)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'white'} onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.9)'}>Running</Link>
        <Link to="/" style={{ color: 'rgba(255, 255, 255, 0.9)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'white'} onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.9)'}>Women</Link>
        <Link to="/" style={{ color: 'rgba(255, 255, 255, 0.9)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'white'} onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.9)'}>Men</Link>
        <Link to="/" style={{ color: 'rgba(255, 255, 255, 0.9)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = 'white'} onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.9)'}>Kids</Link>
      </div>

      {/* Center: Logo */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        fontSize: '1.5rem',
        fontWeight: '800',
        color: 'white'
      }}>
        <span className="material-icons" style={{ fontSize: '32px', color: 'white' }}>
          directions_run
        </span>
        <span>SPORTIFY</span>
      </div>

      {/* Right: Icons and Sign-In */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem',
        justifyContent: 'flex-end',
        alignItems: 'center'
      }}>
        <button style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}>
          <span className="material-icons" style={{ color: 'white' }}>search</span>
        </button>
        {/* Optionally keep or remove the person icon */}
        {/* <button style={{
          backgroundColor: 'black',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}>
          <span className="material-icons" style={{ color: 'white' }}>person_outline</span>
        </button> */}
        <button style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}>
          <span className="material-icons" style={{ color: 'white' }}>shopping_bag</span>
        </button>
        {/* Google Sign-In/Out Button */}
        {!idToken ? (
          <GoogleSignInButton onSignIn={setIdToken} />
        ) : (
          <button
            onClick={handleSignOut}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'; }}
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
};

export default Header; 