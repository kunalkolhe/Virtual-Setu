import React from 'react';
import { Button } from './button';
import { Link } from 'react-router-dom';
import { Shield, FileText, QrCode, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-40 right-20 w-48 h-48 bg-secondary/20 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/4 w-32 h-32 bg-accent/20 rounded-full blur-2xl animate-float"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text Content */}
          <div className="text-center lg:text-left animate-fade-in">
            <div className="inline-flex items-center space-x-2 bg-card-glass/50 backdrop-blur-xl rounded-full px-4 py-2 mb-6 border border-border/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground/80">Government ID Management Made Easy</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="text-gradient">Virtual Setu</span>
              <br />
              <span className="text-foreground">Your Digital</span>
              <br />
              <span className="text-foreground">Identity Hub</span>
            </h1>
            
            <p className="text-xl text-foreground/70 mb-8 max-w-lg">
              Securely manage all your government documents in one place. Generate checklists, 
              upload documents, and access your digital identity card instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                asChild 
                size="lg" 
                className="bg-gradient-primary hover:scale-105 transition-transform glow-primary group"
              >
                <Link to="/register" className="inline-flex items-center">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                asChild
                className="btn-glass hover:scale-105 transition-transform"
              >
                <Link to="/features">Learn More</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-8 mt-12 justify-center lg:justify-start">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">5+</div>
                <div className="text-sm text-foreground/60">Document Types</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">100%</div>
                <div className="text-sm text-foreground/60">Secure</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">24/7</div>
                <div className="text-sm text-foreground/60">Access</div>
              </div>
            </div>
          </div>

          {/* Right Column - 3D Cards */}
          <div className="relative lg:pl-8 animate-scale-in">
            <div className="perspective-1000">
              {/* Main Card */}
              <div className="card-3d p-8 mb-6 transform rotate-y-5">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-gradient-primary rounded-xl">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground">Digital Identity</h3>
                    <p className="text-sm text-foreground/60">Secure & Verified</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm text-foreground/70">Aadhaar Card Verified</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm text-foreground/70">PAN Card Linked</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-sm text-foreground/70">Passport Ready</span>
                  </div>
                </div>
              </div>

              {/* Secondary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="card-3d p-6 text-center">
                  <div className="p-3 bg-gradient-secondary rounded-xl mb-3 mx-auto w-fit">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-card-foreground mb-1">Smart Upload</h4>
                  <p className="text-xs text-foreground/60">AI-powered document detection</p>
                </div>
                
                <div className="card-3d p-6 text-center">
                  <div className="p-3 bg-gradient-hero rounded-xl mb-3 mx-auto w-fit">
                    <QrCode className="h-5 w-5 text-white" />
                  </div>
                  <h4 className="font-semibold text-card-foreground mb-1">Emergency QR</h4>
                  <p className="text-xs text-foreground/60">Instant document access</p>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary/20 rounded-full blur-xl animate-float"></div>
            <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-secondary/20 rounded-full blur-lg animate-float-delayed"></div>
          </div>
        </div>
      </div>
    </section>
  );
};