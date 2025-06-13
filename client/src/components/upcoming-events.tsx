import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";

interface Event {
  id: number;
  title: string;
  description?: string;
  date: string;
  time: string;
  type: 'meeting' | 'deadline' | 'launch' | 'workshop' | 'other';
  priority: 'high' | 'medium' | 'low';
  attendees?: number;
}

interface UpcomingEventsProps {
  events: Event[];
  title?: string;
  showViewAll?: boolean;
}

function getEventTypeColor(type: Event['type']): string {
  switch (type) {
    case 'meeting':
      return 'bg-blue-100 text-blue-800';
    case 'deadline':
      return 'bg-red-100 text-red-800';
    case 'launch':
      return 'bg-green-100 text-green-800';
    case 'workshop':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

function getPriorityColor(priority: Event['priority']): string {
  switch (priority) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-green-500';
    default:
      return 'bg-slate-500';
  }
}

function getEventIcon(type: Event['type']): string {
  switch (type) {
    case 'meeting':
      return 'fas fa-users';
    case 'deadline':
      return 'fas fa-clock';
    case 'launch':
      return 'fas fa-rocket';
    case 'workshop':
      return 'fas fa-tools';
    default:
      return 'fas fa-calendar';
  }
}

// Mock events data
const mockEvents: Event[] = [
  {
    id: 1,
    title: "Summer Collection Launch",
    description: "Q2 product launch meeting",
    date: "2024-06-20",
    time: "10:00",
    type: "launch",
    priority: "high",
    attendees: 8
  },
  {
    id: 2,
    title: "Watchmaking Workshop",
    description: "Technical skills development",
    date: "2024-06-25",
    time: "14:30",
    type: "workshop",
    priority: "medium",
    attendees: 12
  }
];

export default function UpcomingEvents({ 
  events = mockEvents, 
  title = "Upcoming Events",
  showViewAll = true 
}: UpcomingEventsProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {showViewAll && (
          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
            View All
          </Button>
        )}
      </div>
      
      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <i className="fas fa-calendar-alt text-2xl mb-2"></i>
            <p>No upcoming events</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
              <div className="flex items-start space-x-3">
                {/* Priority Indicator */}
                <div className={`w-3 h-3 ${getPriorityColor(event.priority)} rounded-full mt-2 flex-shrink-0`}></div>
                
                {/* Event Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-slate-900">{event.title}</h4>
                    <Badge variant="secondary" className={`text-xs ${getEventTypeColor(event.type)}`}>
                      {event.type}
                    </Badge>
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-slate-600 mb-2">{event.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-slate-500">
                    <div className="flex items-center space-x-1">
                      <i className="fas fa-calendar-day"></i>
                      <span>{format(new Date(event.date), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <i className="fas fa-clock"></i>
                      <span>{event.time}</span>
                    </div>
                    {event.attendees && (
                      <div className="flex items-center space-x-1">
                        <i className="fas fa-users"></i>
                        <span>{event.attendees} attendees</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Event Icon */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <i className={`${getEventIcon(event.type)} text-slate-600`}></i>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-slate-100">
                <Button variant="ghost" size="sm" className="text-xs">
                  View Details
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  Join
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}