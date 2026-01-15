const sanitizeProject = (project, role) => {
  if (role !== "CLIENT") {
    return project;
  }

  const base = project.toObject ? project.toObject() : { ...project };
  const sanitized = { ...base };

  delete sanitized.teamMembers;
  delete sanitized.delayReason;

  if (Array.isArray(sanitized.notes)) {
    sanitized.notes = sanitized.notes.filter((note) => !note.isInternal);
  }

  return sanitized;
};

module.exports = sanitizeProject;
