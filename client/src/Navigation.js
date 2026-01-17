import React from 'react';
import { Link } from 'react-router-dom';

const Navigation = ({ isVisible, toggle, onItemClick }) => {
  // Handle click on navigation items
  const handleItemClick = () => {
    onItemClick();
  };

  return (
    <div className={`navigation ${!isVisible ? 'collapsed' : ''}`}>
      <div className="toggle-icon" onClick={toggle}>☰</div>
      {isVisible && (
        <>
          <h3>Navigation</h3>
          <ul>
            <li>
              <Link 
                to="/packages" 
                className="link-wifi"
                onClick={handleItemClick}
              >
                WiFi Packages
              </Link>
            </li>
            <li>
              <Link 
                to="/hotspot" 
                className="link-hotspot"
                onClick={handleItemClick}
              >
                Hotspot
              </Link>
            </li>
            <li>
              <Link 
                to="/receipts" 
                className="link-receipts"
                onClick={handleItemClick}
              >
                Receipts
              </Link>
            </li>
          </ul>
        </>
      )}
    </div>
  );
};

export default Navigation;