import { MessageCircle, Clock, User } from 'lucide-react';

const Messages = () => {
  const conversations = [
    {
      id: 1,
      name: 'Studio Manager',
      lastMessage: 'Your session tomorrow is confirmed for 2 PM',
      time: '10 min ago',
      unread: true,
      avatar: '🎧'
    },
    {
      id: 2,
      name: 'Mike - Producer',
      lastMessage: 'The mix sounds great! Ready for mastering',
      time: '1 hour ago',
      unread: false,
      avatar: '🎵'
    },
    {
      id: 3,
      name: 'Sarah - Engineer',
      lastMessage: 'Can we reschedule to Friday?',
      time: '2 hours ago',
      unread: true,
      avatar: '🎤'
    },
    {
      id: 4,
      name: 'Beat Store',
      lastMessage: 'New exclusive beats available',
      time: '1 day ago',
      unread: false,
      avatar: '🔥'
    }
  ];

  const notifications = [
    'Session reminder: Tomorrow at 2:00 PM',
    'New beat pack available in store',
    'Your project files are ready for download'
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary neon-glow mb-2">
          Messages
        </h1>
        <p className="text-muted-foreground">
          Stay connected with the studio team
        </p>
      </div>

      {/* Notifications */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Notifications</h2>
        <div className="space-y-3">
          {notifications.map((notification, index) => (
            <div key={index} className="studio-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <MessageCircle className="text-accent" size={16} />
                </div>
                <p className="text-foreground text-sm">{notification}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conversations */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Conversations</h2>
        <div className="space-y-3">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="studio-card cursor-pointer tap-target">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-lg">
                    {conversation.avatar}
                  </div>
                  {conversation.unread && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-bold ${
                      conversation.unread ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {conversation.name}
                    </h3>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>{conversation.time}</span>
                    </div>
                  </div>
                  
                  <p className={`text-sm ${
                    conversation.unread ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {conversation.lastMessage}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="studio-card bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="text-center">
          <MessageCircle className="text-primary mx-auto mb-3" size={32} />
          <h3 className="font-bold text-foreground mb-2">Need Help?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Contact our studio team anytime
          </p>
          <button className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-lg tap-target hover:bg-primary/90 transition-colors">
            Start New Conversation
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messages;