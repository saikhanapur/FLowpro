import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const TemplateGallery = () => {
  const navigate = useNavigate();

  const templates = [
    {
      id: 1,
      name: 'Customer Onboarding',
      description: 'Standard process for onboarding new customers',
      category: 'Sales',
      steps: 8,
      uses: 47
    },
    {
      id: 2,
      name: 'Bug Escalation',
      description: 'Process for escalating critical bugs',
      category: 'Engineering',
      steps: 6,
      uses: 32
    },
    {
      id: 3,
      name: 'Employee Offboarding',
      description: 'HR process for employee departures',
      category: 'HR',
      steps: 10,
      uses: 28
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" data-testid="template-gallery">
      <Button onClick={() => navigate('/')} variant="ghost" className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold heading-font text-slate-800 mb-4">
          Process Templates
        </h1>
        <p className="text-lg text-slate-600">
          Start with pre-built templates and customize to your needs
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-xl font-bold text-slate-800 mb-2">{template.name}</h3>
            <p className="text-sm text-slate-600 mb-4">{template.description}</p>
            <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
              <span>{template.steps} steps</span>
              <span>•</span>
              <span>{template.uses} uses</span>
            </div>
            <Button className="w-full" onClick={() => navigate('/create')}>
              Use Template
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TemplateGallery;
