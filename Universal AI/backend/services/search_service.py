import requests
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET
import json

class SearchService:
    @staticmethod
    def get_weather(location="Chennai"):
        """Get live weather info for a location using wttr.in (keyless JSON)"""
        try:
            url = f"https://wttr.in/{location}?format=j1"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                current = data['current_condition'][0]
                temp = current['temp_C']
                desc = current['weatherDesc'][0]['value']
                humidity = current['humidity']
                wind = current['windspeedKmph']
                return f"Weather in {location}: {temp}°C, {desc}. Humidity: {humidity}%, Wind: {wind} km/h."
        except Exception as e:
            pass
        return f"Could not retrieve weather for '{location}' at the moment."

    @staticmethod
    def get_web_search(query, num_results=5):
        """Performs a web search using DuckDuckGo HTML search (no API key required)"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            url = f"https://html.duckduckgo.com/html/?q={query}"
            response = requests.get(url, headers=headers, timeout=8)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                results = []
                for a in soup.find_all('a', class_='result__snippet')[:num_results]:
                    parent = a.find_parent('div', class_='result__body')
                    if parent:
                        title_el = parent.find('a', class_='result__url')
                        title = title_el.text.strip() if title_el else "Search Result"
                        link = title_el['href'] if title_el and 'href' in title_el.attrs else ""
                        snippet = a.text.strip()
                        results.append(f"Title: {title}\nLink: {link}\nSummary: {snippet}\n")
                if results:
                    return "\n".join(results)
        except Exception as e:
            pass
        return "Unable to perform real-time web search. Please check internet connection."

    @staticmethod
    def get_news():
        """Fetches latest world news from Google News RSS feed"""
        try:
            url = "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                root = ET.fromstring(response.content)
                news_items = []
                for item in root.findall('./channel/item')[:6]:
                    title = item.find('title').text
                    link = item.find('link').text
                    pub_date = item.find('pubDate').text
                    news_items.append(f"- {title} ({pub_date})\n  Link: {link}")
                return "Latest News:\n" + "\n".join(news_items)
        except Exception as e:
            pass
        return "Unable to fetch news updates at this time."

    @staticmethod
    def get_tech_updates():
        """Fetches tech updates from Hacker News RSS feed"""
        try:
            url = "https://news.ycombinator.com/rss"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                root = ET.fromstring(response.content)
                tech_items = []
                for item in root.findall('./channel/item')[:6]:
                    title = item.find('title').text
                    link = item.find('link').text
                    tech_items.append(f"- {title}\n  Link: {link}")
                return "Tech Updates:\n" + "\n".join(tech_items)
        except Exception as e:
            pass
        return "Unable to fetch tech news at this time."

    @staticmethod
    def get_cricket_scores():
        """Fetches cricket score summary from general web search / rss"""
        # Let's perform a live duckduckgo query for "live cricket score" for freshness
        search_res = SearchService.get_web_search("live cricket scores matches cricbuzz espncricinfo", num_results=3)
        if "Unable to perform" not in search_res:
            return f"Current Live Cricket Updates:\n{search_res}"
        return "Live cricket scores are currently unavailable."

    @staticmethod
    def get_stock_market(symbol="AAPL"):
        """Scrapes basic Stock info from Yahoo Finance (keyless)"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            url = f"https://finance.yahoo.com/quote/{symbol}"
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                # Try to extract the stock price
                price_el = soup.find('span', {'data-trending': 'true'}) or soup.find('fin-streamer', {'data-field': 'regularMarketPrice'})
                if price_el:
                    price = price_el.text.strip()
                    change_el = soup.find('fin-streamer', {'data-field': 'regularMarketChangePercent'})
                    change = change_el.text.strip() if change_el else ""
                    return f"Stock {symbol.upper()}: Price ${price} ({change}). Source: Yahoo Finance."
        except Exception as e:
            pass
        # Fallback to duckduckgo search
        search_res = SearchService.get_web_search(f"{symbol} stock price", num_results=2)
        if "Unable to perform" not in search_res:
            return f"Stock Updates for {symbol.upper()}:\n{search_res}"
        return f"Unable to fetch stock info for ticker {symbol}."

    @staticmethod
    def get_currency_rates(base="USD"):
        """Fetches currency exchange rates from keyless API"""
        try:
            url = f"https://open.er-api.com/v6/latest/{base.upper()}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                rates = data.get('rates', {})
                selected = ['INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD']
                rate_str = [f"Base: {base.upper()}"]
                for currency in selected:
                    if currency in rates:
                        rate_str.append(f"1 {base.upper()} = {rates[currency]:.2f} {currency}")
                return ", ".join(rate_str)
        except Exception as e:
            pass
        return "Unable to fetch live currency rates at this time."
