import React from 'react';

const AuthContext = React.createContext({
  authInfo: { isAuthenticated: false, user: null },
  login: () => {},
  logout: () => {}
});

export default AuthContext;