export const getVoiceFromText = async (text) => {
    try {
      const response = await fetch('/api/elevenlabs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      // Assuming data contains an audio URL
      return data.audioUrl;
    } catch (error) {
      console.error('Error calling ElevenLabs API:', error);
      return null;
    }
  };
  