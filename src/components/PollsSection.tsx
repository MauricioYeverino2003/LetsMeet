import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "./ui/progress";
import { Plus, Vote, BarChart3, X } from "lucide-react";

interface PollOption {
  id: string;
  text: string;
  votes: string[]; // array of participant names who voted for this option
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  creator: string;
  createdAt: Date;
}

interface PollsSectionProps {
  confirmedName: string | null;
  participants: string[];
}

export function PollsSection({ confirmedName, participants }: PollsSectionProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newOptions, setNewOptions] = useState(["", ""]);

  const handleCreatePoll = () => {
    if (!confirmedName || !newQuestion.trim()) return;
    
    const validOptions = newOptions.filter(opt => opt.trim());
    if (validOptions.length < 2) return;

    const poll: Poll = {
      id: Date.now().toString(),
      question: newQuestion.trim(),
      options: validOptions.map((text, index) => ({
        id: `${Date.now()}-${index}`,
        text: text.trim(),
        votes: []
      })),
      creator: confirmedName,
      createdAt: new Date()
    };

    setPolls(prev => [...prev, poll]);
    setNewQuestion("");
    setNewOptions(["", ""]);
    setIsCreating(false);
  };

  const handleVote = (pollId: string, optionId: string) => {
    if (!confirmedName) return;

    setPolls(prev => prev.map(poll => {
      if (poll.id !== pollId) return poll;
      
      return {
        ...poll,
        options: poll.options.map(option => {
          // Remove user's vote from all options first
          const votesWithoutUser = option.votes.filter(voter => voter !== confirmedName);
          
          // Add vote to selected option
          if (option.id === optionId) {
            return { ...option, votes: [...votesWithoutUser, confirmedName] };
          }
          
          return { ...option, votes: votesWithoutUser };
        })
      };
    }));
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  const addOption = () => {
    if (newOptions.length < 5) {
      setNewOptions([...newOptions, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== index));
    }
  };

  const getTotalVotes = (poll: Poll) => {
    return poll.options.reduce((total, option) => total + option.votes.length, 0);
  };

  const getUserVote = (poll: Poll) => {
    if (!confirmedName) return null;
    return poll.options.find(option => option.votes.includes(confirmedName));
  };

  if (!confirmedName) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Vote className="w-5 h-5" />
            Polls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-32 text-center space-y-3">
            <Vote className="w-8 h-8 text-muted-foreground" />
            <div>
              <p className="font-medium text-muted-foreground">Polls Unavailable</p>
              <p className="text-sm text-muted-foreground">
                Please confirm your name to create and vote on polls
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Vote className="w-5 h-5" />
          Polls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Create Poll Button */}
          {!isCreating && (
            <Button 
              onClick={() => setIsCreating(true)} 
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Poll
            </Button>
          )}

          {/* Create Poll Form */}
          {isCreating && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Create New Poll</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div>
                <Input
                  placeholder="Enter your question..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Options:</p>
                {newOptions.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1"
                    />
                    {newOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {newOptions.length < 5 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addOption}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Option
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreatePoll} className="flex-1">
                  Create Poll
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreating(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Polls List */}
          <ScrollArea className="h-64">
            <div className="space-y-4">
              {polls.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No polls yet. Create one to get started!
                  </p>
                </div>
              ) : (
                polls.map((poll) => {
                  const totalVotes = getTotalVotes(poll);
                  const userVote = getUserVote(poll);
                  
                  return (
                    <div key={poll.id} className="p-4 border rounded-lg bg-muted/20">
                      <div className="mb-3">
                        <h4 className="font-medium">{poll.question}</h4>
                        <p className="text-xs text-muted-foreground">
                          by {poll.creator} • {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        {poll.options.map((option) => {
                          const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                          const isUserVote = userVote?.id === option.id;
                          
                          return (
                            <div key={option.id} className="space-y-2">
                              <button
                                onClick={() => handleVote(poll.id, option.id)}
                                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                  isUserVote 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border hover:border-primary/50'
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-sm font-medium">{option.text}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {option.votes.length} vote{option.votes.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                <Progress value={percentage} className="h-2" />
                                {percentage > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {Math.round(percentage)}%
                                  </p>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}