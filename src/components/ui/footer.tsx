import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-background-secondary border-t border-border/20 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-primary rounded-xl">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">Virtual Setu</span>
            </Link>
            <p className="text-foreground/70 text-sm leading-relaxed">
              Your trusted digital identity management platform. Secure, efficient, 
              and designed for the modern Indian citizen.
            </p>
            <div className="flex space-x-4">
              <a 
                href="#" 
                className="p-2 bg-card-glass/50 backdrop-blur-xl rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Facebook className="h-4 w-4 text-foreground/70" />
              </a>
              <a 
                href="#" 
                className="p-2 bg-card-glass/50 backdrop-blur-xl rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Twitter className="h-4 w-4 text-foreground/70" />
              </a>
              <a 
                href="#" 
                className="p-2 bg-card-glass/50 backdrop-blur-xl rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Linkedin className="h-4 w-4 text-foreground/70" />
              </a>
              <a 
                href="#" 
                className="p-2 bg-card-glass/50 backdrop-blur-xl rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Instagram className="h-4 w-4 text-foreground/70" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-foreground/70 hover:text-primary transition-colors text-sm">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/features" className="text-foreground/70 hover:text-primary transition-colors text-sm">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-foreground/70 hover:text-primary transition-colors text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-foreground/70 hover:text-primary transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-foreground/70 hover:text-primary transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-foreground/70 text-sm">Document Upload</span>
              </li>
              <li>
                <span className="text-foreground/70 text-sm">Smart Checklists</span>
              </li>
              <li>
                <span className="text-foreground/70 text-sm">Digital ID Card</span>
              </li>
              <li>
                <span className="text-foreground/70 text-sm">Emergency Access</span>
              </li>
              <li>
                <span className="text-foreground/70 text-sm">Document Verification</span>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact Us</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-foreground/70 text-sm">support@virtualsetu.in</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-foreground/70 text-sm">+91 98765 43210</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-primary mt-1" />
                <span className="text-foreground/70 text-sm">
                  Digital India Initiative<br />
                  New Delhi, India
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border/20 mt-12 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-foreground/60 text-sm">
              © 2024 Virtual Setu. All rights reserved. Made with ❤️ for Digital India.
            </p>
            <div className="flex items-center space-x-6 mt-4 sm:mt-0">
              <Link to="/privacy" className="text-foreground/60 hover:text-primary text-sm transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="text-foreground/60 hover:text-primary text-sm transition-colors">
                Terms
              </Link>
              <Link to="/help" className="text-foreground/60 hover:text-primary text-sm transition-colors">
                Help
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};