// Firebase configuration
const FIREBASE_URL = 'https://postproject-200f4-default-rtdb.asia-southeast1.firebasedatabase.app';

// Configure Axios defaults (optional)
axios.defaults.timeout = 10000; // 10 second timeout

// Local data
let posts = [];

// DOM elements
const tableBody = document.getElementById('postList');
const formContainer = document.getElementById('formDiv');
const updateFormContainer = document.getElementById('updateFormDiv');
const messageContainer = document.getElementById('message');
const loadingDiv = document.getElementById('loading');

// UTILITY FUNCTIONS
function showMessage(message, type = 'success') {
  messageContainer.innerHTML = `<div class="${type}">${message}</div>`;
  setTimeout(() => {
    messageContainer.innerHTML = '';
  }, 3000);
}

function showLoading(show) {
  loadingDiv.style.display = show ? 'block' : 'none';
}

// FIREBASE FUNCTIONS WITH AXIOS
async function loadPosts() {
  try {
    showLoading(true);

    // Axios GET request - much simpler than fetch
    const response = await axios.get(`${FIREBASE_URL}/posts.json`);

    const data = response.data; // Axios automatically parses JSON

    if (data) {
      // Convert Firebase object to array
      posts = Object.keys(data).map(key => ({
        firebaseKey: key,
        ...data[key]
      }));
    } else {
      posts = [];
    }

    renderTable();
    showMessage('Posts loaded successfully!');
  } catch (error) {
    // Better error handling with Axios
    const errorMessage = error.response?.data?.error || error.message || 'Failed to load posts';
    showMessage(`Error loading posts: ${errorMessage}`, 'error');
    console.error('Error loading posts:', error);
  } finally {
    showLoading(false);
  }
}

async function savePostToFirebase(post) {
  try {
    // Axios POST - no need for headers or JSON.stringify
    const response = await axios.post(`${FIREBASE_URL}/posts.json`, post);

    return response.data.name; // Firebase returns the generated key
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || 'Failed to save post';
    throw new Error(`Failed to save post: ${errorMessage}`);
  }
}

async function updatePostInFirebase(firebaseKey, updatedData) {
  try {
    // Axios PATCH - cleaner syntax
    await axios.patch(`${FIREBASE_URL}/posts/${firebaseKey}.json`, updatedData);

    return true;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || 'Failed to update post';
    throw new Error(`Failed to update post: ${errorMessage}`);
  }
}

async function deletePostFromFirebase(firebaseKey) {
  try {
    // Axios DELETE - very simple
    await axios.delete(`${FIREBASE_URL}/posts/${firebaseKey}.json`);

    return true;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || 'Failed to delete post';
    throw new Error(`Failed to delete post: ${errorMessage}`);
  }
}

// RENDER FUNCTIONS
function renderRow(post) {
  return `
                <tr>
                    <td>${post.id}</td>
                    <td>${post.title}</td>
                    <td><button class="delete-btn" onclick="deletePost('${post.firebaseKey}', ${post.id})">Delete</button></td>
                    <td><button class="update-btn" onclick="showUpdateForm('${post.firebaseKey}', ${post.id})">Update</button></td>
                </tr>
            `;
}

function renderTable() {
  if (posts.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666;">No posts found. Add your first post!</td></tr>';
  } else {
    tableBody.innerHTML = posts.map(renderRow).join('');
  }
}

// FORM FUNCTIONS
function showForm() {
  formContainer.innerHTML = `
                <form onsubmit="return addPost(event)">
                    <h3>Add New Post</h3>
                    <input type="number" id="idnumber" placeholder="Enter ID" required>
                    <input type="text" id="title" placeholder="Enter Title" required>
                    <button type="submit">📝 Post</button>
                    <button type="button" onclick="closeForm()">❌ Close</button>
                </form>
            `;
}

function closeForm() {
  formContainer.innerHTML = '';
}

// ADD POST WITH AXIOS
async function addPost(event) {
  event.preventDefault();

  const id = parseInt(document.getElementById("idnumber").value, 10);
  const title = document.getElementById("title").value.trim();

  // Validation
  if (posts.some(p => p.id === id)) {
    showMessage("ID already exists!", 'error');
    return false;
  }

  if (posts.some(p => p.title === title)) {
    showMessage("Title already exists!", 'error');
    return false;
  }

  try {
    showLoading(true);
    const newPost = { id, title };

    // Save to Firebase using Axios
    const firebaseKey = await savePostToFirebase(newPost);

    // Add to local array
    posts.push({ ...newPost, firebaseKey });

    formContainer.innerHTML = '';
    renderTable();
    showMessage('Post added successfully!');
  } catch (error) {
    showMessage(error.message, 'error');
    console.error('Add post error:', error);
  } finally {
    showLoading(false);
  }

  return false;
}

// DELETE POST WITH AXIOS
async function deletePost(firebaseKey, id) {
  if (!confirm(`Are you sure you want to delete post with ID ${id}?`)) {
    return;
  }

  try {
    showLoading(true);

    // Delete from Firebase using Axios
    await deletePostFromFirebase(firebaseKey);

    // Remove from local array
    posts = posts.filter(p => p.firebaseKey !== firebaseKey);

    renderTable();
    showMessage('Post deleted successfully!');
  } catch (error) {
    showMessage(error.message, 'error');
    console.error('Delete post error:', error);
  } finally {
    showLoading(false);
  }
}

// UPDATE FUNCTIONS WITH AXIOS
function showUpdateForm(firebaseKey, id) {
  const post = posts.find(p => p.firebaseKey === firebaseKey);
  updateFormContainer.innerHTML = `
                <form onsubmit="return updatePost(event, '${firebaseKey}')">
                    <h3>Update Post (ID: ${id})</h3>
                    <input type="text" id="titleUpdate" placeholder="Enter New Title" value="${post.title}" required>
                    <button type="submit">Update</button>
                    <button type="button" onclick="closeUpdateForm()">Close</button>
                </form>
            `;
}

function closeUpdateForm() {
  updateFormContainer.innerHTML = '';
}

// UPDATE POST WITH AXIOS
async function updatePost(event, firebaseKey) {
  event.preventDefault();

  const updatedTitle = document.getElementById("titleUpdate").value.trim();

  // Validation - check if title exists in other posts
  if (posts.some(p => p.firebaseKey !== firebaseKey && p.title === updatedTitle)) {
    showMessage("Title already exists!", 'error');
    return false;
  }

  try {
    showLoading(true);

    // Update in Firebase using Axios
    await updatePostInFirebase(firebaseKey, { title: updatedTitle });

    // Update local array
    const index = posts.findIndex(p => p.firebaseKey === firebaseKey);
    if (index !== -1) {
      posts[index].title = updatedTitle;
    }

    updateFormContainer.innerHTML = '';
    renderTable();
    showMessage('Post updated successfully!');
  } catch (error) {
    showMessage(error.message, 'error');
    console.error('Update post error:', error);
  } finally {
    showLoading(false);
  }

  return false;
}

// Axios Request Interceptor (optional - for debugging)
axios.interceptors.request.use(
  function (config) {
    console.log('Axios Request:', config.method.toUpperCase(), config.url);
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

// Axios Response Interceptor (optional - for debugging)
axios.interceptors.response.use(
  function (response) {
    console.log('Axios Response:', response.status, response.statusText);
    return response;
  },
  function (error) {
    console.log('Axios Error:', error.response?.status, error.response?.statusText);
    return Promise.reject(error);
  }
);

// INITIAL LOAD
window.addEventListener('load', () => {
  loadPosts();
});