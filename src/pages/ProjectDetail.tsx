import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle, FileText, Music, Zap, MessageSquare, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import AudioPlayer from '@/components/AudioPlayer';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { 
    loading, 
    uploading, 
    currentProject, 
    loadProject, 
    uploadProjectFile, 
    markAsDelivered 
  } = useProjects();

  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<{[key: string]: File[]}>({
    idea: [],
    stems: [],
    draft: [],
    final: []
  });

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  if (!user) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Login Necessário</h2>
        <p className="text-muted-foreground">Por favor, inicie sessão para ver os detalhes do projeto.</p>
      </div>
    );
  }

  if (loading && !currentProject) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">A carregar projeto...</p>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Projeto Não Encontrado</h2>
        <p className="text-muted-foreground">O projeto solicitado não foi encontrado.</p>
        <Button onClick={() => navigate('/projects')} className="mt-4">
          Voltar aos Projetos
        </Button>
      </div>
    );
  }

  const handleFileSelect = (kind: string, files: FileList | null) => {
    if (files) {
      setSelectedFiles(prev => ({
        ...prev,
        [kind]: Array.from(files)
      }));
    }
  };

  const handleUpload = async (kind: 'idea' | 'stems' | 'draft' | 'final') => {
    const files = selectedFiles[kind];
    if (files.length === 0 || !projectId) return;

    for (const file of files) {
      await uploadProjectFile(projectId, file);
    }

    // Clear selected files after upload
    setSelectedFiles(prev => ({
      ...prev,
      [kind]: []
    }));
  };

  const handleSendMessage = async () => {
    // Messages functionality removed
  };

  const handleMarkDelivered = async () => {
    if (projectId) {
      await markAsDelivered(projectId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      case 'review':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'delivered':
        return 'bg-green-500/20 text-green-700 dark:text-green-300';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const getFileIcon = (kind: string) => {
    switch (kind) {
      case 'idea':
        return FileText;
      case 'stems':
        return Music;
      case 'draft':
        return Zap;
      case 'final':
        return CheckCircle;
      default:
        return FileText;
    }
  };

  const canUpload = (kind: string) => {
    if (isAdmin()) return true;
    return kind === 'idea' || kind === 'stems';
  };

  const projectFiles = currentProject.files || [];
  const filesByKind = projectFiles.reduce((acc, file) => {
    if (!acc[file.kind]) acc[file.kind] = [];
    acc[file.kind].push(file);
    return acc;
  }, {} as Record<string, typeof projectFiles>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/projects')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar aos Projetos
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{currentProject.title}</h1>
          <p className="text-muted-foreground">
            Criado em {format(new Date(currentProject.created_at), 'd MMMM yyyy', { locale: require('date-fns/locale/pt') })}
          </p>
        </div>
        <Badge className={`${getStatusColor(currentProject.status)}`}>
          {currentProject.status.replace('_', ' ')}
        </Badge>
        {isAdmin() && currentProject.status !== 'delivered' && (
          <Button
            onClick={handleMarkDelivered}
            disabled={loading}
            className="ml-2"
          >
            <Package className="w-4 h-4 mr-2" />
            Mark Delivered
          </Button>
        )}
      </div>

      {/* Booking Details Card */}
      {currentProject.booking && (
        <Card className="studio-card bg-gradient-to-br from-primary/10 to-accent/10">
          <CardHeader>
            <CardTitle className="text-lg">Detalhes da Reserva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Serviço</p>
              <p className="font-medium">{currentProject.booking.service?.name || 'Recording Session'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data e Hora</p>
              <p className="font-medium">
                {format(new Date(currentProject.booking.date), 'dd/MM/yyyy', { locale: pt })} às {currentProject.booking.start_time.slice(0, 5)} - {currentProject.booking.end_time.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Morada</p>
              <p className="font-medium">Pinhal do General, Seixal</p>
            </div>
            {currentProject.booking.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="font-medium">{currentProject.booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="files">Files & Uploads</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-6">
          {/* File Types Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {['idea', 'stems', 'draft', 'final'].map((kind) => {
              const Icon = getFileIcon(kind);
              const files = filesByKind[kind] || [];
              const canUserUpload = canUpload(kind);
              
              return (
                <Card key={kind} className="studio-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 capitalize text-lg">
                      <Icon className="w-5 h-5 text-primary" />
                      {kind} Files
                      <Badge variant="outline" className="text-xs">
                        {files.length}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {kind === 'idea' && 'Initial concepts and references'}
                      {kind === 'stems' && 'Individual track stems'}
                      {kind === 'draft' && 'Work-in-progress versions'}
                      {kind === 'final' && 'Completed final versions'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Existing Files */}
                    {files.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Current Files</Label>
                        {files.map((file) => (
                          <div key={file.id}>
                            {file.url.match(/\.(mp3|wav|m4a|aac|flac|ogg)$/i) ? (
                              <AudioPlayer
                                src={file.url}
                                fileName={`${kind}-${format(new Date(file.created_at), "d 'de' MMM", { locale: pt })}`}
                              />
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-secondary rounded">
                                <Icon className="w-4 h-4" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {kind}-{format(new Date(file.created_at), "d 'de' MMM", { locale: pt })}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(file.created_at), "d 'de' MMM, yyyy", { locale: pt })}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  asChild
                                  className="h-auto p-1"
                                >
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download
                                  >
                                    ↓
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Section */}
                    {canUserUpload && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Upload New Files</Label>
                        <input
                          type="file"
                          id={`upload-${kind}`}
                          multiple
                          accept="audio/*,*/*"
                          onChange={(e) => handleFileSelect(kind, e.target.files)}
                          className="hidden"
                        />
                        
                        {selectedFiles[kind].length > 0 && (
                          <div className="space-y-1 mb-2">
                            {selectedFiles[kind].map((file, index) => (
                              <div key={index} className="text-xs bg-secondary p-2 rounded">
                                {file.name}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`upload-${kind}`)?.click()}
                            className="flex-1"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Select Files
                          </Button>
                          
                          {selectedFiles[kind].length > 0 && (
                            <Button
                              size="sm"
                              onClick={() => handleUpload(kind as any)}
                              disabled={uploading}
                            >
                              {uploading ? 'Uploading...' : 'Upload'}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {!canUserUpload && (
                      <p className="text-sm text-muted-foreground">
                        {isAdmin() ? 'Admin uploads only' : 'Studio team will upload these files'}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default ProjectDetail;
