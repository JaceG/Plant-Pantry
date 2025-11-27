import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components';
import { HomeScreen, ProductDetailScreen, ShoppingListScreen } from './screens';
import { listsApi } from './api';
import './App.css';

function App() {
  const [defaultListId, setDefaultListId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch or create default list on app load
    const loadDefaultList = async () => {
      try {
        const response = await listsApi.getDefaultList();
        setDefaultListId(response.list.id);
      } catch (error) {
        console.error('Failed to load default list:', error);
      }
    };
    
    loadDefaultList();
  }, []);

  return (
    <Router>
      <div className="app">
        <Header defaultListId={defaultListId} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/products/:id" element={<ProductDetailScreen />} />
            <Route path="/lists" element={<ShoppingListScreen />} />
            <Route path="/lists/:id" element={<ShoppingListScreen />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <div className="footer-content">
            <span className="footer-logo">🌱 PlantPantry</span>
            <span className="footer-tagline">Discover vegan groceries everywhere</span>
          </div>
        </footer>
    </div>
    </Router>
  );
}

export default App;
