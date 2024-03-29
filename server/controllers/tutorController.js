const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Tutor = require('../models/tutor');
const Booking = require('../models/booking');
// Tutor registration
exports.register = async (req, res) => {
    try {
        // Extract tutor registration details from request body
        const { firstName, lastName, email, phoneNumber, password, collegeId, languages, courses, profilePicture } = req.body;
        const formattedCollegeId = mongoose.Types.ObjectId.isValid(collegeId) ? collegeId : null;

        // Create a new tutor instance
        const tutor = new Tutor({
            firstName,
            lastName,
            email,
            phoneNumber,
            password,
            college: formattedCollegeId,
            languages,
            courses,
            profilePicture
        });

        // Save the tutor to the database
        await tutor.save();

        // Respond with success message and tutor details
        res.status(201).json({ message: 'Tutor registered successfully', tutor });
    } catch (error) {
        // Log any errors for debugging
        console.error('Error registering tutor:', error);
        // Respond with internal server error
        res.status(500).json({ message: 'Internal server error' });
    }
};


exports.getTutors = async (req, res) => {
    try {
      const tutors = await Tutor.find().populate('college');
      res.status(200).json(tutors);
    } catch (error) {
      console.error('Error fetching tutors:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  };
  
// Tutor login
exports.login = async (req, res) => {
    try {
        // Extract login credentials from request body
        const { email, password } = req.body;

        // Find the tutor by email
        const tutor = await Tutor.findByCredentials(email, password);

        // If tutor not found, respond with error
        if (!tutor) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Compare the password with the hashed password (no need to hash here)
        const isMatch = await bcrypt.compare(password, tutor.password);

        // If passwords don't match, respond with error
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = tutor.generateAuthToken();

        // Respond with success message and token
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        // Log any errors for debugging
        console.error('Error logging in tutor:', error);
        // Respond with internal server error
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const tutorId = req.tutor._id;

        // Fetch the student profile data from the database
        const profile = await Tutor.findById(tutorId);

        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        // Send the profile data in the response
        res.status(200).json({ tutor: profile });
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getTutorBookings = async (req, res) => {
    try {
      const tutorId = req.tutor._id; // Assuming tutorId is extracted from the token
      const bookings = await Booking.find({ tutor: tutorId }).populate('student');
      res.status(200).json({ bookings });
    } catch (error) {
      console.error('Error fetching tutor bookings:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

exports.logout = async (req, res) => {
    try {
        // Clear the token cookie from the client
        res.clearCookie("token");

        // Respond with success message
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        // Handle errors
        console.error('Error logging out tutor:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.deleteProfile = async (req, res) => {
    try {
        // Extract tutor ID from request object
        const tutorId = req.tutor._id;

        // Delete tutor profile from the database
        // Assuming your Tutor model is named 'Tutor'
        await Tutor.findByIdAndDelete(tutorId);

        // Respond with success message
        res.status(200).json({ message: 'Tutor profile deleted successfully' });
    } catch (error) {
        // Handle errors
        console.error('Error deleting tutor profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.editProfile = async (req, res) => {
    try {
        const tutorId = req.tutor._id;

        const { firstName, lastName, email, phoneNumber,collegeName, languages, courses, profilePicture } = req.body;
        if (req.file) {
            profilePicture = req.file.path;
        }

        const updatedFields = {
                firstName,
                lastName,
                email,
                phoneNumber,
                languages,
                courses,
                profilePicture
            };
            const updatedTutor = await Tutor.findByIdAndUpdate(tutorId, updatedFields, { new: true });

        if (!updatedTutor) {
            return res.status(404).json({ message: 'Tutor not found' });
        }

        res.status(200).json({ message: 'Tutor profile updated successfully', tutor: updatedTutor });
    } catch (error) {
        console.error('Error editing tutor profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
/// Assuming you have a route handler for searching tutors
exports.searchTutors = async (req, res) => {
    try {
        const { name, colleges } = req.query;

        // If name is undefined, set it to an empty string
        const trimmedName = name ? name.trim() : '';

        // If colleges is a single value or undefined, convert it to an array
        const collegeIds = Array.isArray(colleges) ? colleges : colleges ? [colleges] : [];

        // Implement your search logic using trimmedName and collegeIds
        const query = {};

        // Case: Only colleges are selected
        if (trimmedName === '' && collegeIds.length > 0) {
            query.college = { $in: collegeIds };
        }
        
        // Case: Only tutor name is provided
        else if (trimmedName !== '' && collegeIds.length === 0) {
            query.$or = [
                { firstName: { $regex: trimmedName, $options: 'i' } },
                { lastName: { $regex: trimmedName, $options: 'i' } }
            ];
        }

        // Case: Both tutor name and colleges are provided
        else if (trimmedName !== '' && collegeIds.length > 0) {
            query.$or = [
                { firstName: { $regex: trimmedName, $options: 'i' } },
                { lastName: { $regex: trimmedName, $options: 'i' } }
            ];
            query.college = { $in: collegeIds };
        }

        const tutors = await Tutor.find(query).populate('college');

        res.status(200).json(tutors);
    } catch (error) {
        console.error('Error searching tutors:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
