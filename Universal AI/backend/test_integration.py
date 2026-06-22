import unittest
import json
from app import create_app
from database import db
from models import User, Chat, Message
from services.search_service import SearchService

class TestUniversalAIAssistant(unittest.TestCase):
    def setUp(self):
        # Configure app for testing
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:' # Isolation
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_health_endpoint(self):
        """Test API server health check"""
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')

    def test_user_authentication_flow(self):
        """Test user registration, login, and profile fetching"""
        # 1. Signup
        signup_payload = {
            "name": "Integration Tester",
            "email": "tester@example.com",
            "password": "securepassword123"
        }
        response = self.client.post('/api/auth/signup', 
                                    data=json.dumps(signup_payload),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertIn('access_token', data)
        self.assertEqual(data['user']['email'], 'tester@example.com')

        # 2. Login
        login_payload = {
            "email": "tester@example.com",
            "password": "securepassword123"
        }
        response = self.client.post('/api/auth/login', 
                                    data=json.dumps(login_payload),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        token = data['access_token']

        # 3. Profile Access
        headers = {'Authorization': f'Bearer {token}'}
        response = self.client.get('/api/auth/profile', headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['user']['name'], 'Integration Tester')

    def test_chat_crud_operations(self):
        """Test chat creation, renaming, and history querying"""
        # Register and login to get JWT
        signup_payload = {"name": "User", "email": "user@example.com", "password": "pass"}
        res = self.client.post('/api/auth/signup', data=json.dumps(signup_payload), content_type='application/json')
        token = json.loads(res.data)['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        # 1. Create a chat
        res = self.client.post('/api/chats', 
                              data=json.dumps({"title": "Initial Chat Title"}), 
                              content_type='application/json',
                              headers=headers)
        self.assertEqual(res.status_code, 201)
        chat_id = json.loads(res.data)['chat']['id']

        # 2. Rename chat
        res = self.client.put(f'/api/chats/{chat_id}', 
                             data=json.dumps({"title": "Renamed Chat Title", "is_bookmarked": True}),
                             content_type='application/json',
                             headers=headers)
        self.assertEqual(res.status_code, 200)

        # 3. Fetch Chats List
        res = self.client.get('/api/chats', headers=headers)
        self.assertEqual(res.status_code, 200)
        chats = json.loads(res.data)['chats']
        self.assertEqual(len(chats), 1)
        self.assertEqual(chats[0]['title'], 'Renamed Chat Title')
        self.assertTrue(chats[0]['is_bookmarked'])

    def test_real_time_search_scrapers(self):
        """Test keyless scraping helpers (Weather and News)"""
        # Weather Service test (wttr.in)
        weather_res = SearchService.get_weather("Chennai")
        self.assertTrue(isinstance(weather_res, str))
        self.assertIn("Weather", weather_res)

        # News Service test (Google News RSS)
        news_res = SearchService.get_news()
        self.assertTrue(isinstance(news_res, str))
        self.assertIn("Latest News", news_res)

if __name__ == '__main__':
    unittest.main()
