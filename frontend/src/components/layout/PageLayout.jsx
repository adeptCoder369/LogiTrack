import { Header } from './Header';

export const PageLayout = ({ title, subtitle, children, actions }) => {
  return (
    <div className="min-h-screen">
      <Header title={title} subtitle={subtitle} />
      
      <main className="p-6 lg:p-8">
        {actions && (
          <div className="flex justify-between items-center mb-6">
            <div />
            <div className="flex gap-3">
              {actions}
            </div>
          </div>
        )}
        
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};
