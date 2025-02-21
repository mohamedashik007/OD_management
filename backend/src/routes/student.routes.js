import express from 'express';
import { 
  createApplication,
  deleteApplication,
  searchStudents,
  getApplicationStatus,
  getApplicationActivities,
  deleteApplicationStudent,
  addStudentsToApplication
} from '../controller/student.controller.js';
import { protectRoute, authorizeRoles } from '../middleware/protectRoute.js';

const router = express.Router();

// Apply protection and authorization to all routes
router.use(protectRoute, authorizeRoles('student'));

// Create new OD application
router.post('/applications', createApplication);

// Delete OD application
router.delete('/applications/:applicationId', deleteApplication);

// Search students
router.get('/search', searchStudents);

// Get application status
router.get('/applications/status', getApplicationStatus);

// Get application activities
router.get('/applications/:applicationId/activities', getApplicationActivities);

// Delete a student from an application
router.delete('/applications/:applicationId/students/:regno', deleteApplicationStudent);

// Add a student to an existing application
router.post('/applications/:applicationId/students', addStudentsToApplication);

export default router;