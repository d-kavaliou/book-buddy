import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Note {
  date: string;
  book_name: string;
  note: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

if (!BACKEND_URL) {
  console.error('Environment variable BACKEND_URL is not defined');
}

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${BACKEND_URL}/api/get_notes`);

      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }

      const data = await response.json();
      setNotes(data.notes);
    } catch (err) {
      setError('Failed to load notes. Please try again later.');
      console.error('Error fetching notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNote = async (index: number) => {
    try {
      // TODO: Implement delete note API endpoint
      const updatedNotes = notes.filter((_, i) => i !== index);
      setNotes(updatedNotes);
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  return (
    <div className="container mx-auto py-8 min-h-screen">
      <div className="flex justify-center items-center mb-8">
        <h1 className="text-4xl font-bold">Reading Notes</h1>
      </div>

      {isLoading ? (
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Loading notes...</p>
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-6 text-center text-destructive">
            <p>{error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notes.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No notes yet. Start reading and add some notes!</p>
              </CardContent>
            </Card>
          ) : (
            notes.map((note, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {new Date(note.date).toLocaleDateString()}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNote(index)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="mb-2">{note.note}</p>
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                    <p className="font-medium mb-1">Book:</p>
                    <p>{note.book_name}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <div className="flex justify-center mt-8">
        <Link 
          to="/" 
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default Notes;