// Packages.js
import React from 'react';

const Packages = () => {
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Select Your Package</h2>

      <div style={styles.cardContainer}>
        <div style={styles.card}>
          <h3>Basic</h3>
          <p>$1500/month</p>
          <p>7 Mbps</p>
        </div>
        <div style={styles.card}>
          <h3>Intermediate</h3>
          <p>$2000/month</p>
          <p>10 Mbps</p>
        </div>
        <div style={styles.card}>
          <h3>Big</h3>
          <p>$3000/month</p>
          <p>12 Mbps</p>
        </div>
        <div style={styles.card}>
          <h3>Mega</h3>
          <p>$6000/month</p>
          <p>20 Mbps</p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    textAlign: 'center'
  },
  heading: {
    color: '#3498db',
    marginBottom: '20px'
  },
  cardContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    flexWrap: 'wrap'
  },
  card: {
    width: '200px',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    margin: '10px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textAlign: 'center'
  }
};

export default Packages;
