# AI Feedback - Copy & Paste Method

## ✨ How It Works

Instead of integrating with AI APIs directly, Linguapath now uses a **smart copy-paste approach**:

1. **Click "Get AI Feedback"** button in writing lessons
2. **Prompt is automatically copied** to your clipboard
3. **Click to open** your favorite AI chat (Gemini, Claude, ChatGPT, or Qwen)
4. **Paste the prompt** and get detailed feedback
5. **Come back** to continue your lesson

---

## 🎯 Benefits

| Advantage | Why It Matters |
|-----------|----------------|
| **No API keys needed** | No setup, no configuration |
| **Free to use** | Use your existing free AI quotas |
| **No ToS violations** | Manual use is allowed (not automated) |
| **Better AI quality** | Full chat experience with follow-ups |
| **Your choice** | Use Gemini, Claude, ChatGPT, Qwen, etc. |
| **Always updated** | AI models improve automatically |
| **No maintenance** | No backend, no server costs |

---

## 🚀 Quick Start

### In Writing Lessons:

1. **Write your answer** in the textarea
2. **Click "✨ Get AI Feedback"** (purple button)
3. **Choose an AI chat** from the quick links:
   - [Gemini](https://gemini.google.com) - Free, unlimited
   - [Claude](https://claude.ai/new) - Free tier available
   - [ChatGPT](https://chatgpt.com) - Free tier available
   - [Qwen Chat](https://chat.qwen.ai) - Free, good for English learning
4. **Paste the prompt** (Ctrl+V / Cmd+V)
5. **Review the AI's feedback**
6. **Apply suggestions** to improve your writing
7. **Submit** when satisfied!

---

## 📋 Example Prompt

When you click "Get AI Feedback", this prompt is copied:

```
You are an English learning assistant for Linguapath. Please analyze this student's writing:

**Student's CEFR Level**: B1
**Writing Task**: Describe your last vacation in 5-6 sentences. Use past tense.
**Minimum Words**: 50

**Student's Answer**:
I go to Bali last week. The beach is beautiful. I eat seafood everyday.

Please provide:
1. **Naturalness Score** (1-5 stars)
2. **Overall Feedback** - Encouraging summary with 2-3 key improvement areas
3. **Specific Errors** - List mistakes with:
   - Original text snippet
   - Suggested correction  
   - Brief explanation of what's wrong
4. **Improved Version** - A rewritten version that maintains the original meaning but sounds more natural

Be encouraging and educational. Focus on clarity and naturalness for language learners at this level.
```

---

## 🎓 Example AI Response

You'll get feedback like this:

### ⭐ Naturalness Score: 2/5

### 📝 Overall Feedback
Good attempt at describing your vacation! Focus on using **past tense consistently** since you're writing about a completed trip. Also try to add more details to meet the 5-6 sentence requirement.

### ❌ Specific Errors

1. **"I go to Bali"** → "I went to Bali"
   - Use past tense (went) for completed actions

2. **"The beach is beautiful"** → "The beach was beautiful"
   - Maintain past tense consistency

3. **"I eat seafood"** → "I ate seafood"
   - Past tense of irregular verb "eat"

### ✅ Improved Version
> I went to Bali last week. The beach was beautiful with clear blue water and white sand. I ate delicious seafood every day, especially grilled fish. I swam in the ocean and relaxed on the beach. It was an amazing vacation that I will never forget.

---

## 💡 Tips for Best Results

1. **Use the quick links** - One-click access to your favorite AI
2. **Ask follow-up questions** - "Can you explain why this is wrong?"
3. **Request alternatives** - "Can you give me 3 different ways to say this?"
4. **Compare versions** - Study the AI's improved version
5. **Learn from explanations** - Don't just copy, understand why
6. **Try different AIs** - Each has different strengths:
   - **Gemini**: Great explanations, integrates with Google
   - **Claude**: Natural, conversational feedback
   - **ChatGPT**: Detailed, structured responses
   - **Qwen**: Good for English learners, patient

---

## 🔒 Privacy & Security

- ✅ **No data sent to our servers** - Everything is client-side
- ✅ **You control what's shared** - You choose what to paste into AI chats
- ✅ **No API keys stored** - Nothing to configure or manage
- ✅ **Uses official AI chat websites** - Standard terms of service apply

---

## 🆚 Comparison: Old vs New Approach

| Feature | Old (API Integration) | New (Copy & Paste) |
|---------|----------------------|-------------------|
| **Setup** | API keys, backend routes | None - works immediately |
| **Cost** | Pay-per-use or ToS violation | Free (use existing quotas) |
| **Legal** | ⚠️ Coding Plan ToS violation | ✅ Fully compliant |
| **Quality** | Fixed prompt, no follow-ups | Interactive, can ask questions |
| **Maintenance** | Backend updates needed | Zero maintenance |
| **Flexibility** | One AI provider | Choose any AI chat |

---

## 🛠️ Technical Details

### How the Feature Works:

1. **Generates prompt** from:
   - Student's writing text
   - Lesson prompt
   - CEFR level (from localStorage)
   - Minimum word count

2. **Copies to clipboard** using `navigator.clipboard.writeText()`

3. **Shows quick links** to popular AI chat services

4. **No backend required** - 100% client-side

### Files Modified:

- `src/app/lesson/[curriculumId]/[lessonId]/page.tsx`
  - Added `copyPromptForAI()` function
  - Added `promptCopied` state
  - Added "Get AI Feedback" button
  - Added quick links to AI chats

---

## 🎁 Future Enhancements (Optional)

If you want to extend this feature later:

1. **"Paste AI Feedback"** - Parse AI responses back into the app
2. **Custom prompts** - Let users customize the AI prompt
3. **Save favorite prompts** - Store prompt templates
4. **Export feedback** - Download AI feedback as PDF/Markdown
5. **Compare AIs** - Get feedback from multiple AIs side-by-side

---

## ❓ FAQ

**Q: Do I need to create an account on AI chat sites?**  
A: Most offer free access without signup, but creating an account lets you save chat history.

**Q: Is this cheating?**  
A: No! You're using AI as a learning tool, like a tutor. The goal is to learn from the feedback.

**Q: Can I use other AI chats not listed?**  
A: Absolutely! The prompt works with any AI assistant. The quick links are just convenient options.

**Q: What if I don't have access to these AI chats?**  
A: The traditional "Check Grammar" button (LanguageTool) still works free without any AI.

**Q: Will the prompt work in other languages?**  
A: Yes! Just modify the prompt template to request feedback in your preferred language.

---

## 📞 Support

If you have suggestions or issues:
1. Try a different AI chat service
2. Check that text is copied (paste into notepad to verify)
3. Make sure you've written something before clicking the button
4. Clear browser clipboard permissions if blocked

**Happy Learning! 🎉**

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify API key in DashScope console
3. Test API key with curl or Postman
4. Check Alibaba Cloud service status
