export const sendQueryToMistral = async (query, context = '') => {
    try {
      const response = await fetch('/api/mistral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, context })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error querying Mistral API:', error);
      return null;
    }
  };