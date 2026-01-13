const sanitizeProject = (project, role) => {
  if (role !== 'CLIENT') return project;

  // Convert to lean object if it's a Mongoose document
  const p = project.toObject ? project.toObject() : project;

  // Remove internal fields for Clients
  delete p.teamMembers; // Clients don't need to see individual dev assignments
  delete p.delayReason; // Maybe hide delay reason if it's internal logic? Req says "hide internal data". I'll keep it safe.
  
  // Filter Notes if they are populated
  if (p.notes && Array.isArray(p.notes)) {
    p.notes = p.notes.filter(note => !note.isInternal);
  }

  return p;
};

module.exports = sanitizeProject;
