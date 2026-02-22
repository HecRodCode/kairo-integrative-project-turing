from app.models.plan_request import GeneratePlanRequest

def build_personalized_prompt(request: GeneratePlanRequest) -> str:
    """
    Constructs a highly detailed prompt for the LLM to generate a custom 
    4-week learning roadmap based on student performance and soft skills.
    """
    
    # Identify the primary soft skill gap to focus the roadmap's non-technical side
    skills = {
        "autonomy": request.soft_skills.autonomy,
        "time_management": request.soft_skills.time_management,
        "problem_solving": request.soft_skills.problem_solving,
        "communication": request.soft_skills.communication,
        "teamwork": request.soft_skills.teamwork
    }
    
    weakest_skill = min(skills, key=skills.get)
    weakest_score = skills[weakest_skill]
    
    # Technical blockers formatting
    tech_blockers = ", ".join(request.moodle_status.struggling_topics) if request.moodle_status.struggling_topics else "None reported"
    interests = ", ".join(request.additional_topics) if request.additional_topics else "General Web Development"

    # Construct the Professional Prompt using Delimiters (###) for better LLM parsing
    prompt = f"""
### ROLE
You are a Senior Educational Architect at Riwi, a high-performance tech bootcamp. Your goal is to design a personalized 4-week "Path to Success" for a Coder.

### STUDENT PROFILE
- Coder Name: {request.coder.full_name}
- Learning Style: {request.soft_skills.learning_style}
- Current Module: {request.moodle_status.module_number} (Week {request.moodle_status.current_week})

### ASSESSMENT DATA
- Soft Skill Scores (1-5): {skills}
- Critical Focus Area: {weakest_skill.replace('_', ' ').upper()} (Score: {weakest_score}/5)
- Technical Blockers: {tech_blockers}
- Career Interests: {interests}

### INSTRUCTIONS
1. Create a 4-week roadmap (5 days per week = 20 days total).
2. For each day, provide a Technical Activity (45 min) and a Soft Skill Activity (20 min).
3. The Technical Activities must directly address the 'Technical Blockers'.
4. The Soft Skill Activities must follow a progression to improve the 'Critical Focus Area'.
5. Use a tone that is encouraging, professional, and aligned with the learning style: {request.soft_skills.learning_style}.

### OUTPUT SCHEMA (STRICT JSON ONLY)
{{
  "weeks": [
    {{
      "week_number": 1,
      "focus": "Weekly theme string",
      "days": [
        {{
          "day": 1,
          "technical_activity": {{
            "title": "String",
            "description": "Actionable steps",
            "duration_minutes": 45,
            "difficulty": "beginner|intermediate|advanced",
            "resources": ["URL or Book Title"]
          }},
          "soft_skill_activity": {{
            "title": "String",
            "skill": "{weakest_skill}",
            "description": "Practical exercise",
            "duration_minutes": 20,
            "reflection_prompt": "Open question for the coder"
          }}
        }}
      ]
    }}
  ]
}}

### FINAL MANDATE
- Language: Responses must be in Spanish (to match the user's interface).
- No talk: Do not include anything outside the JSON brackets.
- Consistency: Ensure all 20 days are generated.

BEGIN GENERATION:"""
    
    return prompt