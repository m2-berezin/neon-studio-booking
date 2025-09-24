import { Clock, Calendar, MapPin, Music } from 'lucide-react';

const Book = () => {
  const timeSlots = [
    '9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '5:00 PM', '7:00 PM'
  ];

  const sessionTypes = [
    { name: 'Recording', duration: '2 hours', price: '$150' },
    { name: 'Mixing', duration: '3 hours', price: '$200' },
    { name: 'Mastering', duration: '1 hour', price: '$75' },
    { name: 'Full Production', duration: '6 hours', price: '$400' },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary neon-glow mb-2">
          Book Your Session
        </h1>
        <p className="text-muted-foreground">
          Schedule time with our professional engineers
        </p>
      </div>

      {/* Session Types */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Session Types</h2>
        <div className="grid grid-cols-1 gap-3">
          {sessionTypes.map((session) => (
            <div key={session.name} className="studio-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Music className="text-primary" size={20} />
                  <div>
                    <h3 className="font-bold text-foreground">{session.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Clock size={14} className="mr-1" />
                      {session.duration}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-accent accent-glow">
                  {session.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Times */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Available Times</h2>
        <div className="grid grid-cols-2 gap-3">
          {timeSlots.map((time) => (
            <button
              key={time}
              className="studio-card text-left tap-target"
            >
              <div className="flex items-center space-x-3">
                <Calendar className="text-primary" size={18} />
                <span className="font-medium text-foreground">{time}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Studio Location */}
      <div className="studio-card">
        <div className="flex items-start space-x-3">
          <MapPin className="text-accent mt-1" size={20} />
          <div>
            <h3 className="font-bold text-foreground mb-1">Studio Location</h3>
            <p className="text-muted-foreground text-sm">
              123 Music Row, Nashville, TN 37203<br />
              Professional recording facility with state-of-the-art equipment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Book;