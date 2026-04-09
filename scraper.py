from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)

@app.route("/api/scrape", methods=["POST"])
def scrape():
    data = request.get_json()
    url = data.get("url")

    if not url:
        return jsonify({"text": "No URL provided"})

    try:
        headers = {
            "User-Agent": "Mozilla/5.0"
        }

        res = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(res.text, "html.parser")

        # REMOVE unwanted tags
        for tag in soup(["script", "style", "noscript"]):
            tag.extract()

        text = soup.get_text(separator=" ")

        # CLEAN text
        lines = [line.strip() for line in text.splitlines()]
        text = " ".join([line for line in lines if line])

        # LIMIT SIZE (important)
        text = text[:5000]

        return jsonify({"text": text})

    except Exception as e:
        return jsonify({"text": f"Error scraping site: {str(e)}"})
