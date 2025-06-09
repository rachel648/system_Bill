import React from 'react';
import { Link } from 'react-router-dom';

const Navigation = ({ isVisible }) => (
  <div className={`navigation ${!isVisible ? 'hidden' : ''}`}>
    <h3>Navigation</h3>
    <ul>
      <li><Link to="/packages" className="link-wifi">WiFi Packages</Link></li>
      <li><Link to="/hotspot" className="link-hotspot">Hotspot</Link></li>
      <li><Link to="/receipts" className="link-receipts">Receipts</Link></li>
    </ul>
  </div>
);

export default Navigation;
