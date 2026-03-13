import mongoose from 'mongoose';

const ExperienceSchema = new mongoose.Schema({
  title: String,
  company: String,
  description: String,
  startDate: String,
  endDate: String,
  current: Boolean
});

const EducationSchema = new mongoose.Schema({
  degree: String,
  institution: String,
  year: String
});

const ProfileMetadataSchema = new mongoose.Schema({
  user_id: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  avatar_url: {
    type: String,
    default: null
  },
  skills: {
    type: [String],
    default: []
  },
  experience: {
    type: [ExperienceSchema],
    default: []
  },
  education: {
    type: [EducationSchema],
    default: []
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the updated_at field on save
ProfileMetadataSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const ProfileMetadata = mongoose.model('ProfileMetadata', ProfileMetadataSchema);

export default ProfileMetadata;
