from flask import Flask, request, jsonify
import PyPDF2
import docx

app = Flask(__name__)

def extract_text(file, filename):
    if filename.endswith(".txt"):
        return file.read().decode("utf-8", errors="ignore")

    if filename.endswith(".pdf"):
        reader = PyPDF2.PdfReader(file)
        return "\n".join([p.extract_text() or "" for p in reader.pages])

    if filename.endswith(".docx"):
        doc = docx.Document(file)
        return "\n".join([p.text for p in doc.paragraphs])

    return "[Unsupported file type]"

@app.route("/upload", methods=["POST"])
def upload():
    file = request.files["file"]
    text = extract_text(file, file.filename.lower())
    return jsonify({"text": text})

if __name__ == "__main__":
    app.run(port=5000)
