import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm mb-4">
      <button
        onClick={items[0]?.onClick}
        className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
      >
        <Home className="w-4 h-4" />
      </button>
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {index === items.length - 1 ? (
            <span className="font-medium text-gray-900">{item.label}</span>
          ) : (
            <button
              onClick={item.onClick}
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              {item.label}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}
