from flask import Flask, request, jsonify, send_from_directory
import os
import json

from src.audio_transcriber import AudioTranscriber

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

transcriber = AudioTranscriber(model_size="base")

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    file_type = request.form.get('file_type', 'unknown')

    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    filename = file.filename
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    text, timestamp_map = transcriber.transcribe(filepath)

    with open(filepath + '.txt', 'w') as f:
        f.write(text)

    with open(filepath + '.json', 'w') as f:
        json.dump(timestamp_map, f)

    return jsonify({'message': 'File uploaded successfully', 'filename': filename, 'file_type': file_type}), 200


@app.route('/files', methods=['GET'])
def list_files():
    files = os.listdir(UPLOAD_FOLDER)
    return jsonify(files)


@app.route('/uploads/<filename>', methods=['GET'])
def get_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


if __name__ == '__main__':
    app.run(debug=True)
