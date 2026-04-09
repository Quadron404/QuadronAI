# scraper.py
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from urllib.request import Request, urlopen
from urllib.error import URLError
from html.parser import HTMLParser

HOST = "0.0.0.0"
PORT = 5000


# 🔹 CLEAN TEXT EXTRACTOR
class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = []
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript"):
            self.skip = True

        # Add spacing for readability
        if tag in ("p", "div", "br", "li", "h1", "h2", "h3"):
            self.text.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            cleaned = data.strip()
            if cleaned:
                self.text.append(cleaned)


# 🔹 MAIN HANDLER
class Handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/scrape":
            self.send_error(404)
            return

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
            url = data.get("url", "").strip()

            if not url.startswith("http"):
                url = "https://" + url

            if not url:
                raise Exception("No URL provided")

            # 🔹 STRONG HEADERS (IMPORTANT)
            req = Request(url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept-Language": "en-US,en;q=0.9"
            })

            response = urlopen(req, timeout=10)
            html = response.read().decode("utf-8", errors="ignore")

            # 🔹 PARSE TEXT
            parser = TextExtractor()
            parser.feed(html)

            text = " ".join(parser.text)

            # 🔹 CLEAN EXTRA SPACES
            text = " ".join(text.split())

            # 🔹 LIMIT SIZE (important for AI)
            text = text[:4000]

            result = {
                "text": f"{text}"
            }

        except URLError:
            result = {"text": "Error: Website unreachable"}
        except Exception as e:
            result = {"text": f"Error: {str(e)}"}

        # 🔹 RESPONSE
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        self.wfile.write(json.dumps(result).encode("utf-8"))


# 🔹 RUN SERVER
if __name__ == "__main__":
    print(f"Scraper running on http://{HOST}:{PORT}")
    HTTPServer((HOST, PORT), Handler).serve_forever()
