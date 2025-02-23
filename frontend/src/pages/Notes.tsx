import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Note {
  id: string;
  text: string;
  context: string;
  timestamp: Date;
}

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>(() => {
    const savedNotes = localStorage.getItem('reader-notes');
    return savedNotes ? JSON.parse(savedNotes) : [];
  });

  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    localStorage.setItem('reader-notes', JSON.stringify(updatedNotes));
  };

  return (
    <div className="container mx-auto py-8 min-h-screen">
      <div className="flex justify-center items-center mb-8">
        <h1 className="text-4xl font-bold">Reading Notes</h1>
      </div>

      <div className="grid gap-4">
        {notes.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No notes yet. Start reading and add some notes!</p>
            </CardContent>
          </Card>
        ) : (
          notes.map((note) => (
            <Card key={note.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {new Date(note.timestamp).toLocaleDateString()}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteNote(note.id)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <p className="mb-2">{note.text}</p>
                <div className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
                  <p className="font-medium mb-1">Reading Context:</p>
                  <p>{note.context}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="flex justify-center">
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