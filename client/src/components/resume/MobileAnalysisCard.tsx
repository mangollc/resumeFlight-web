
import React from 'react';
import { Card } from "@/components/ui/card";
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface MobileAnalysisCardProps {
  title: string;
  icon: 'strength' | 'improvement' | 'gap';
  items: string[];
}

export function MobileAnalysisCard({ title, icon, items = [] }: MobileAnalysisCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const getIcon = () => {
    switch(icon) {
      case 'strength':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'improvement':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'gap':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="font-medium text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">
            ({items?.length || 0})
          </span>
        </div>
        <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </button>
      
      {isExpanded && items && items.length > 0 && (
        <div className="px-4 pb-3">
          <ul className="space-y-2">
            {items.map((item, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                <span className="flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {isExpanded && (!items || items.length === 0) && (
        <div className="px-4 pb-3 text-sm text-muted-foreground">
          No items found.
        </div>
      )}
    </Card>
  );
}
