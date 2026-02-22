import os
from datetime import datetime
# Heavy imports (xgboost, pandas, sklearn) are moved inside methods to save memory on Render

class RouteRecommender:
    def __init__(self, model_path="route_model.json"):
        self.model = None
        self.model_path = model_path
        self.feature_names = [
            'distance', 'duration', 'aqi', 'traffic_delay',
            'hour', 'day_of_week', 'is_weekend'
        ]
        
    def generate_training_data(self, n_samples=200):
        """
        Generate synthetic training data for initial model
        In production, this would use real user selection history
        """
        import numpy as np
        import pandas as pd
        np.random.seed(42)
        
        data = []
        for _ in range(n_samples):
            # Generate route features
            distance = np.random.uniform(10, 200)  # km
            duration = distance * np.random.uniform(0.8, 1.5)  # minutes
            aqi = np.random.randint(20, 200)  # AQI value
            traffic_delay = np.random.uniform(0, 30)  # minutes
            hour = np.random.randint(0, 24)
            day_of_week = np.random.randint(0, 7)
            is_weekend = 1 if day_of_week >= 5 else 0
            
            # Simulate user preference based on patterns
            # Users prefer cleanest routes when AQI is high
            # Users prefer fastest routes during rush hour
            # Users prefer balanced routes otherwise
            
            if aqi > 150:
                # High pollution - prefer cleanest
                preference = 1  # cleanest
            elif hour in [7, 8, 9, 17, 18, 19] and not is_weekend:
                # Rush hour - prefer fastest
                preference = 0  # fastest
            elif traffic_delay > 15:
                # Heavy traffic - prefer fastest
                preference = 0  # fastest
            else:
                # Normal conditions - prefer balanced
                preference = 2  # balanced
            
            data.append({
                'distance': distance,
                'duration': duration,
                'aqi': aqi,
                'traffic_delay': traffic_delay,
                'hour': hour,
                'day_of_week': day_of_week,
                'is_weekend': is_weekend,
                'preference': preference
            })
        
        return pd.DataFrame(data)
    
    def train(self, training_data=None):
        """Train XGBoost model on route selection data"""
        import xgboost as xgb
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score
        
        if training_data is None:
            print("Generating synthetic training data...")
            training_data = self.generate_training_data()
        
        # Prepare features and target
        X = training_data[self.feature_names]
        y = training_data['preference']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train XGBoost model
        print("Training XGBoost model...")
        self.model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            objective='multi:softmax',
            num_class=3,
            random_state=42
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        print(f"Model accuracy: {accuracy:.2%}")
        
        # Save model
        self.save_model()
        
        return accuracy
    
    def save_model(self):
        """Save trained model to file"""
        if self.model:
            self.model.save_model(self.model_path)
            print(f"Model saved to {self.model_path}")
    
    def load_model(self):
        """Load trained model from file"""
        if os.path.exists(self.model_path):
            import xgboost as xgb
            self.model = xgb.XGBClassifier()
            self.model.load_model(self.model_path)
            print(f"Model loaded from {self.model_path}")
            return True
        return False
    
    def predict_preference(self, route_features):
        """
        Predict user preference for a route
        Returns: 0 (fastest), 1 (cleanest), or 2 (balanced)
        """
        import pandas as pd
        if not self.model:
            if not self.load_model():
                print("No model found, training new model...")
                self.train()
        
        # Prepare features
        features = pd.DataFrame([route_features])[self.feature_names]
        
        # Predict
        prediction = self.model.predict(features)[0]
        probabilities = self.model.predict_proba(features)[0]
        
        return int(prediction), probabilities
    
    def get_route_scores(self, routes, current_time=None):
        """
        Score all routes and return ML-enhanced recommendations
        
        Args:
            routes: List of route dictionaries with distance, duration, aqi, traffic
            current_time: datetime object (defaults to now)
        
        Returns:
            List of routes with ML scores and recommended index
        """
        if current_time is None:
            current_time = datetime.now()
        
        hour = current_time.hour
        day_of_week = current_time.weekday()
        is_weekend = 1 if day_of_week >= 5 else 0
        
        scored_routes = []
        
        for route in routes:
            # Extract features
            traffic_delay = route.get('traffic', {}).get('delay_minutes', 0) if route.get('traffic') else 0
            
            features = {
                'distance': route['distance'],
                'duration': route['duration'],
                'aqi': route['aqi'],
                'traffic_delay': traffic_delay,
                'hour': hour,
                'day_of_week': day_of_week,
                'is_weekend': is_weekend
            }
            
            # Get ML prediction
            preference, probabilities = self.predict_preference(features)
            
            # Calculate ML confidence score
            ml_confidence = float(probabilities[preference])
            
            # Adjust route score based on ML prediction
            route_copy = route.copy()
            route_copy['ml_preference'] = int(preference)
            route_copy['ml_confidence'] = ml_confidence
            route_copy['ml_probabilities'] = {
                'fastest': float(probabilities[0]),
                'cleanest': float(probabilities[1]),
                'balanced': float(probabilities[2])
            }
            
            scored_routes.append(route_copy)
        
        # Determine recommended route based on ML
        # Find route that matches ML preference
        recommended_idx = 0
        max_confidence = 0
        
        for idx, route in enumerate(scored_routes):
            route_type_map = {'fastest': 0, 'cleanest': 1, 'balanced': 2}
            route_type_idx = route_type_map.get(route['type'], 2)
            
            # If route type matches ML preference and has high confidence
            if route['ml_preference'] == route_type_idx:
                if route['ml_confidence'] > max_confidence:
                    max_confidence = route['ml_confidence']
                    recommended_idx = idx
        
        return scored_routes, recommended_idx

# Initialize global recommender
recommender = RouteRecommender()

# Train model on first import if not exists
if not recommender.load_model():
    print("Training initial ML model...")
    recommender.train()
