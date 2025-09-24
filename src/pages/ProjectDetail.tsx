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
import { useMessages } from '@/hooks/useMessages';
import AudioPlayer from '@/components/AudioPlayer';
import { format } from 'date-fns';
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
  const {
    currentThread,
    loadThread,
    sendMessage,
  } = useMessages();

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
      // Load project messages
      if (user) {
        loadThread(projectId);
      }
    }
  }, [projectId, user]);

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
      await uploadProjectFile(projectId, file, kind);
    }

    // Clear selected files after upload
    setSelectedFiles(prev => ({
      ...prev,
      [kind]: []
    }));
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !projectId) return;

    // Find the client or admin to send message to
    let recipientId;
    if (isAdmin()) {
      recipientId = currentProject.client_id;
    } else {
      const { data: adminUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .maybeSingle();
      recipientId = adminUser?.id;
    }

    if (recipientId) {
      const success = await sendMessage(recipientId, message, 'project');
      if (success) {
        setMessage('');
      }
    }
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

      <Tabs defaultValue="files" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files">Files & Uploads</TabsTrigger>
          <TabsTrigger value="messages">Project Updates</TabsTrigger>
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
                                fileName={`${kind}-${format(new Date(file.created_at), 'MMM-d')}`}
                              />
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-secondary rounded">
                                <Icon className="w-4 h-4" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {kind}-{format(new Date(file.created_at), 'MMM-d')}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(file.created_at), 'MMM d, yyyy')}
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

        <TabsContent value="messages" className="space-y-6">
          <Card className="studio-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Project Updates
              </CardTitle>
              <CardDescription>
                Threaded conversation about this project
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* Messages */}
              <ScrollArea className="h-96 mb-4">
                <div className="space-y-4">
                  {currentThread.map((msg) => {
                    const isFromUser = msg.sender_id === user.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isFromUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isFromUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap mb-1">
                            {msg.body}
                          </p>
                          <p className="text-xs opacity-70">
                            {format(new Date(msg.created_at), 'MMM d, HH:mm')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a project update..."
                  className="flex-1"
                  rows={2}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || loading}
                >
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetail;
