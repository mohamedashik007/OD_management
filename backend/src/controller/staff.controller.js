import pool from "../config/db.js";

export const getDepartmentApplications = async (req, res) => {
  try {
    const { department, section, semester } = req.query;
    const staffId = req.user.user_id;

    // Get applications for department-class-semester
    const [applications] = await pool.query(
      `SELECT a.*, s.regno, s.name AS student_name 
       FROM applications a
       JOIN students s ON a.applied_by = s.regno
       JOIN departments d ON s.dep_id = d.id
       WHERE d.name = ? 
         AND s.section = ? 
         AND s.academic_term_id = ?`,
      [department, section, semester]
    );

    res.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching department applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPendingMenteeApplications = async (req, res) => {
  try {
    const staffId = req.user.user_id;

    // Get pending applications for mentees
    const [applications] = await pool.query(
      `SELECT a.id, a.event_name, a.from_date, a.to_date, 
              a.type, s.regno, s.name AS student_name
       FROM applications a
       JOIN application_students ast ON a.id = ast.application_id
       JOIN students s ON ast.regno = s.regno
       WHERE s.tutor_id = ?
         AND ast.mentor_approval_status = 'pending'`,
      [staffId]
    );

    res.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching mentee applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveStudentApplication = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { applicationId, regno } = req.params;
    const { status, comment } = req.body;
    const staffId = req.user.user_id;

    // Verify mentorship relationship
    const [isMentor] = await connection.query(
      `SELECT 1 FROM students 
       WHERE regno = ? AND tutor_id = ?`,
      [regno, staffId]
    );

    if (isMentor.length === 0) {
      return res.status(403).json({ 
        error: 'Unauthorized - Not the student\'s mentor' 
      });
    }

    // Update approval status
    await connection.query(
      `UPDATE application_students 
       SET mentor_approval_status = ?,
           mentor_approval_date = NOW(),
           mentor_comment = ?
       WHERE application_id = ? 
         AND regno = ?`,
      [status, comment, applicationId, regno]
    );

    await connection.commit();
    res.status(200).json({ message: 'Application status updated' });
  } catch (error) {
    await connection.rollback();
    console.error('Error approving application:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
};

export const getStudentApplications = async (req, res) => {
  try {
    const { regno } = req.query;
    const staffId = req.user.user_id;

    // Step 1: Verify if the staff has access to the student's data
    const [isAuthorized] = await pool.query(
      `SELECT 1 FROM students 
       WHERE regno = ? AND tutor_id = ?`,
      [regno, staffId]
    );

    if (isAuthorized.length === 0) {
      return res.status(403).json({ 
        error: 'Unauthorized - Not the student\'s mentor' 
      });
    }

    // Step 2: Fetch approved applications for the student
    const [applications] = await pool.query(
      `SELECT 
         a.id, 
         a.event_name, 
         a.from_date, 
         a.to_date, 
         a.type, 
         a.status, 
         a.hod_approval_status,
         ast.mentor_approval_status,
         ast.mentor_approval_date,
         ast.mentor_comment
       FROM applications a
       JOIN application_students ast ON a.id = ast.application_id
       WHERE ast.regno = ? 
         AND a.hod_approval_status = 'approved'`,
      [regno]
    );

    res.status(200).json(applications);
  } catch (error) {
    console.error('Error fetching student applications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};