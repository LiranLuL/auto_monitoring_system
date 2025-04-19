#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import json
import logging
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from database import Database
from predictive_analyzer import PredictiveAnalyzer

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("api_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("APIServer")

# Initialize Flask app
app = Flask(__name__)

# Initialize database and analyzer
db = Database()
analyzer = PredictiveAnalyzer()

# Ensure that analysis table exists
db.create_analysis_table_if_not_exists()

# Authentication middleware
def authenticate():
    """
    Проверяет токен авторизации в заголовке запроса.
    
    Returns:
        bool: True если токен верный, иначе False
    """
    auth_header = request.headers.get('Authorization')
    expected_token = os.getenv('API_TOKEN', 'your_secret_token_here')
    
    if not auth_header:
        logger.warning("No Authorization header provided")
        return False
        
    try:
        scheme, token = auth_header.split()
        if scheme.lower() != 'bearer':
            logger.warning(f"Invalid authentication scheme: {scheme}")
            return False
            
        if token != expected_token:
            logger.warning("Invalid token provided")
            return False
            
        return True
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        return False

@app.route('/health', methods=['GET'])
def health_check():
    """
    Эндпоинт для проверки работоспособности сервиса.
    """
    return jsonify({
        'status': 'ok',
        'service': 'predictive_analysis',
        'version': '1.0.0'
    })

@app.route('/analyze', methods=['POST'])
def analyze():
    """
    Эндпоинт для запуска анализа для всех автомобилей.
    """
    if not authenticate():
        return jsonify({
            'status': 'error',
            'message': 'Unauthorized'
        }), 401
    
    try:
        results = analyzer.run_analysis()
        
        if results:
            return jsonify({
                'status': 'success',
                'message': f'Analysis completed for {len(results)} vehicles',
                'results': results
            })
        else:
            return jsonify({
                'status': 'warning',
                'message': 'No vehicles to analyze or analysis failed'
            })
    
    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/analyze/<vehicle_id>', methods=['POST'])
def analyze_vehicle(vehicle_id):
    """
    Эндпоинт для запуска анализа для конкретного автомобиля.
    """
    if not authenticate():
        return jsonify({
            'status': 'error',
            'message': 'Unauthorized'
        }), 401
    
    try:
        results = analyzer.run_analysis(vehicle_id)
        
        if results:
            return jsonify({
                'status': 'success',
                'message': f'Analysis completed for vehicle {vehicle_id}',
                'results': results[0] if isinstance(results, list) else results
            })
        else:
            return jsonify({
                'status': 'warning',
                'message': f'Vehicle {vehicle_id} not found or analysis failed'
            })
    
    except Exception as e:
        logger.error(f"Error during vehicle analysis: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/analysis/latest/<vehicle_id>', methods=['GET'])
def get_latest_analysis(vehicle_id):
    """
    Эндпоинт для получения последнего результата анализа для автомобиля.
    """
    if not authenticate():
        return jsonify({
            'status': 'error',
            'message': 'Unauthorized'
        }), 401
    
    try:
        # Try direct method if available (pure mock)
        if hasattr(db, 'data') and 'vehicle_analysis' in db.data:
            # Get directly from in-memory data structure
            vehicle_id = int(vehicle_id) if vehicle_id.isdigit() else vehicle_id
            analyses = [a for a in db.data['vehicle_analysis'] 
                       if a.get('vehicle_id') == vehicle_id]
            
            # Sort by created_at and get the latest
            analyses.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            if analyses:
                result = analyses[0]
                # Parse recommendations
                if 'recommendations' in result and isinstance(result['recommendations'], str):
                    result['recommendations'] = result['recommendations'].split(',')
                
                return jsonify({
                    'status': 'success',
                    'analysis': result
                })
            else:
                return jsonify({
                    'status': 'warning',
                    'message': f'No analysis found for vehicle {vehicle_id}'
                })
        else:
            # Fall back to SQL approach
            query = """
            SELECT * FROM vehicle_analysis
            WHERE vehicle_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """
            
            result = db.execute_query(query, (vehicle_id,))
            
            if result:
                # Parse recommendations from comma-separated string to list
                if 'recommendations' in result[0]:
                    result[0]['recommendations'] = result[0]['recommendations'].split(',')
                
                return jsonify({
                    'status': 'success',
                    'analysis': result[0]
                })
            else:
                return jsonify({
                    'status': 'warning',
                    'message': f'No analysis found for vehicle {vehicle_id}'
                })
    
    except Exception as e:
        logger.error(f"Error getting latest analysis: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/analysis/history/<vehicle_id>', methods=['GET'])
def get_analysis_history(vehicle_id):
    """
    Эндпоинт для получения истории анализов для автомобиля.
    """
    if not authenticate():
        return jsonify({
            'status': 'error',
            'message': 'Unauthorized'
        }), 401
    
    try:
        # Try direct method if available (pure mock)
        if hasattr(db, 'data') and 'vehicle_analysis' in db.data:
            # Get directly from in-memory data structure
            vehicle_id = int(vehicle_id) if vehicle_id.isdigit() else vehicle_id
            analyses = [a for a in db.data['vehicle_analysis'] 
                       if a.get('vehicle_id') == vehicle_id]
            
            # Sort by created_at
            analyses.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            if analyses:
                # Parse recommendations
                for result in analyses:
                    if 'recommendations' in result and isinstance(result['recommendations'], str):
                        result['recommendations'] = result['recommendations'].split(',')
                
                return jsonify({
                    'status': 'success',
                    'history': analyses
                })
            else:
                return jsonify({
                    'status': 'warning',
                    'message': f'No analysis history found for vehicle {vehicle_id}'
                })
        else:
            # Fall back to SQL approach
            query = """
            SELECT * FROM vehicle_analysis
            WHERE vehicle_id = ?
            ORDER BY created_at DESC
            """
            
            results = db.execute_query(query, (vehicle_id,))
            
            if results:
                # Parse recommendations for each result
                for result in results:
                    if 'recommendations' in result:
                        result['recommendations'] = result['recommendations'].split(',')
                
                return jsonify({
                    'status': 'success',
                    'history': results
                })
            else:
                return jsonify({
                    'status': 'warning',
                    'message': f'No analysis history found for vehicle {vehicle_id}'
                })
    
    except Exception as e:
        logger.error(f"Error getting analysis history: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Get server host and port from environment variables
    host = os.getenv('SERVER_HOST', '0.0.0.0')
    port = int(os.getenv('SERVER_PORT', 5001))
    
    # Start the server
    logger.info(f"Starting API server on {host}:{port}")
    app.run(host=host, port=port, debug=False) 