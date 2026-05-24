import React from 'react';
import { Shield, Upload, CheckSquare, CreditCard, QrCode, Zap } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Secure Authentication',
    description: 'Multi-layer security with PIN protection and encrypted storage',
    gradient: 'bg-gradient-primary'
  },
  {
    icon: Upload,
    title: 'Smart Document Upload',
    description: 'AI-powered document recognition and secure cloud storage',
    gradient: 'bg-gradient-secondary'
  },
  {
    icon: CheckSquare,
    title: 'Dynamic Checklists',
    description: 'Personalized document requirements based on your needs',
    gradient: 'bg-gradient-hero'
  },
  {
    icon: CreditCard,
    title: 'Virtual Smart Card',
    description: 'Digital identity card with all your essential information',
    gradient: 'bg-gradient-primary'
  },
  {
    icon: QrCode,
    title: 'Emergency Access',
    description: 'QR code for instant document access in emergencies',
    gradient: 'bg-gradient-secondary'
  },
  {
    icon: Zap,
    title: 'Instant Verification',
    description: 'Real-time document status and verification updates',
    gradient: 'bg-gradient-hero'
  }
];

export const FeaturesSection = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            <span className="text-gradient">Powerful Features</span>
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto">
            Everything you need to manage your digital identity securely and efficiently
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="card-3d p-8 group hover:scale-105 transition-all duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`p-4 ${feature.gradient} rounded-2xl mb-6 w-fit group-hover:scale-110 transition-transform glow-primary`}>
                  <Icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-xl font-semibold text-card-foreground mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-foreground/70 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
            );
          })}
        </div>

        {/* Additional stats section */}
        <div className="mt-20 text-center">
          <div className="card-3d p-8 max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gradient mb-8">
              Trusted by Thousands of Indians
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
                <div className="text-foreground/60">Uptime Guarantee</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary mb-2">256-bit</div>
                <div className="text-foreground/60">Encryption Security</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent mb-2">Instant</div>
                <div className="text-foreground/60">Document Access</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};