import os
import google.generativeai as genai
from services.search_service import SearchService

class AIService:
    @staticmethod
    def get_api_key(user_key=None):
        """Resolves the API key: user-specific key takes priority, then env key"""
        if user_key and user_key.strip():
            return user_key.strip()
        return os.environ.get('GEMINI_API_KEY', '')

    @classmethod
    def classify_intent_and_fetch_context(cls, query, api_key):
        """Uses LLM to detect if real-time web context is needed, and fetches it"""
        # Quick pre-filter keywords for performance
        query_lower = query.lower()
        
        # Rule-based fast routing
        if "weather" in query_lower or "temperature" in query_lower:
            # Extract possible city name
            words = query.split()
            city = "Chennai"  # Default
            for word in words:
                if word[0].isupper() and word.lower() not in ["weather", "in", "at", "for", "the", "current", "what", "is"]:
                    city = word.strip("?,.!")
                    break
            return SearchService.get_weather(city)
            
        if "cricket" in query_lower or "score" in query_lower:
            return SearchService.get_cricket_scores()
            
        if "news" in query_lower or "headline" in query_lower:
            if "tech" in query_lower:
                return SearchService.get_tech_updates()
            return SearchService.get_news()

        if "stock" in query_lower or "ticker" in query_lower or "share price" in query_lower:
            # Try to find a potential stock symbol
            words = query.upper().split()
            symbol = "AAPL"  # Default
            for word in words:
                if len(word) <= 5 and word.isalpha() and word not in ["STOCK", "PRICE", "SHARE", "WHAT", "IS", "THE", "GET"]:
                    symbol = word
                    break
            return SearchService.get_stock_market(symbol)

        if "exchange rate" in query_lower or "currency" in query_lower or "conversion" in query_lower or " usd" in query_lower or " inr" in query_lower:
            return SearchService.get_currency_rates("USD")

        # Let Gemini classify for general real-time queries
        if not api_key:
            return None
            
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = (
                "Analyze the following user query and decide if it requires fresh, real-time information from the web "
                "(like weather, news, stock rates, cricket scores, or current events). "
                "Respond with EXACTLY one of these categories: WEATHER:city, NEWS, CRICKET, STOCK:ticker, CURRENCY:base, WEB_SEARCH:keywords, or NONE. "
                "If the query is a general knowledge, coding, or conversational query, respond with NONE.\n\n"
                f"Query: {query}\n"
                "Category:"
            )
            response = model.generate_content(prompt)
            decision = response.text.strip().upper()
            
            if decision.startswith("WEATHER"):
                parts = decision.split(":")
                city = parts[1] if len(parts) > 1 and parts[1] != "CITY" else "Chennai"
                return SearchService.get_weather(city)
            elif decision == "NEWS":
                return SearchService.get_news()
            elif decision == "CRICKET":
                return SearchService.get_cricket_scores()
            elif decision.startswith("STOCK"):
                parts = decision.split(":")
                symbol = parts[1] if len(parts) > 1 and parts[1] != "TICKER" else "AAPL"
                return SearchService.get_stock_market(symbol)
            elif decision.startswith("CURRENCY"):
                parts = decision.split(":")
                base = parts[1] if len(parts) > 1 and parts[1] != "BASE" else "USD"
                return SearchService.get_currency_rates(base)
            elif decision.startswith("WEB_SEARCH"):
                parts = decision.split(":")
                search_query = parts[1] if len(parts) > 1 else query
                return SearchService.get_web_search(search_query)
        except Exception:
            pass
            
        # Fallback to a generic DuckDuckGo search if query contains searching intent
        if any(w in query_lower for w in ["search", "google", "find out", "who is", "latest"]):
            return SearchService.get_web_search(query)
            
        return None

    @classmethod
    def generate_response_stream(cls, query, chat_history, system_instruction, file_data=None, user_key=None):
        """Generates a text stream responding to the query, integrating history and file inputs"""
        api_key = cls.get_api_key(user_key)
        if not api_key:
            yield "Error: Gemini API Key is not set. Please configure it in your Settings panel or check the server configuration."
            return

        try:
            genai.configure(api_key=api_key)
            
            # Fetch real-time web context if needed
            web_context = cls.classify_intent_and_fetch_context(query, api_key)
            
            # Build the system instruction / prompt modifier
            full_system_instruction = (
                "You are Universal AI, a modern, highly capable multilingual AI assistant. "
                "You support and auto-detect the following languages: English, Tamil, Hindi, Telugu, Malayalam, Kannada, French, German, Spanish, Japanese, Chinese, Arabic. "
                "Always respond in the language in which the user queries you, or default to English. "
                "For code queries, always format the code correctly inside markdown blocks with proper language syntax. "
                "Keep answers detailed, informative, and engaging. "
            )
            if system_instruction:
                full_system_instruction += f"\nSpecific Task Mode Instruction: {system_instruction}"

            model = genai.GenerativeModel(
                model_name='gemini-1.5-flash',
                system_instruction=full_system_instruction
            )
            
            # Construct model contents
            contents = []
            
            # Add message history context (limit to last 15 messages for token usage and latency)
            for msg in chat_history[-15:]:
                role = 'user' if msg['role'] == 'user' else 'model'
                contents.append({'role': role, 'parts': [msg['content']]})
                
            # Prepare current user prompt parts
            user_parts = []
            
            # If web context exists, prepended as context
            if web_context:
                user_parts.append(f"[Real-time Context from Web Search]\n{web_context}\n\n")
                
            # If there's an uploaded file (like PDF text or image bytes)
            if file_data:
                # If image input
                if file_data.get('type', '').startswith('image/'):
                    user_parts.append({
                        "mime_type": file_data['type'],
                        "data": file_data['bytes']
                    })
                    user_parts.append(f"[Multimodal Context: Attached Image]\n")
                # If PDF text input
                elif file_data.get('type') == 'application/pdf':
                    user_parts.append(f"[Document Content: Uploaded PDF]\n{file_data['text']}\n\n")

            # Append the actual query text
            user_parts.append(query)
            
            # Add current user prompt as the final content entry
            contents.append({'role': 'user', 'parts': user_parts})
            
            # Request streaming generation
            response = model.generate_content(contents, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            yield f"Error calling Gemini API: {str(e)}"
