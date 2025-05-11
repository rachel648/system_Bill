// Packages.js
import React from 'react';

const Packages = () => {
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Select Your Package</h2>

      <div style={styles.cardContainer}>
        <div style={{...styles.card, ...styles.basicCard}}>
          <h3>Basic</h3>
          <p>$1500/month</p>
          <p>7 Mbps</p>
        </div>
        <div style={{...styles.card, ...styles.intermediateCard}}>
          <h3>Intermediate</h3>
          <p>$2000/month</p>
          <p>10 Mbps</p>
        </div>
        <div style={{...styles.card, ...styles.bigCard}}>
          <h3>Big</h3>
          <p>$3000/month</p>
          <p>12 Mbps</p>
        </div>
        <div style={{...styles.card, ...styles.megaCard}}>
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
    textAlign: 'center',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'pointer',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
    }
  },
  basicCard: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
    }
  },
  intermediateCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
    }
  },
  bigCard: {
    backgroundColor: '#d1ecf1',
    borderColor: '#bee5eb',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
    }
  },
  megaCard: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    '&:hover': {
      transform: 'scale(1.05)',
      boxShadow: '0 5px 15px rgba(0,0,0,0.2)'
    }
  }
};

export default Packages;