<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Authentication</title>

<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family:Arial, Helvetica, sans-serif;
}

body{
    height:100vh;
    display:flex;
    justify-content:center;
    align-items:center;
    background:linear-gradient(135deg,#6C63FF,#4F46E5);
}

.container{
    width:360px;
    background:#fff;
    border-radius:20px;
    padding:35px;
    box-shadow:0 15px 35px rgba(0,0,0,.2);
}

h2{
    text-align:center;
    margin-bottom:25px;
    color:#333;
}

.input-box{
    margin-bottom:18px;
}

.input-box label{
    display:block;
    margin-bottom:8px;
    color:#555;
    font-size:14px;
}

.input-box input{
    width:100%;
    padding:14px;
    border:1px solid #ddd;
    border-radius:10px;
    outline:none;
    transition:.3s;
}

.input-box input:focus{
    border-color:#6C63FF;
}

.options{
    display:flex;
    justify-content:space-between;
    font-size:13px;
    margin-bottom:20px;
}

.options a{
    color:#6C63FF;
    text-decoration:none;
}

button{
    width:100%;
    padding:14px;
    border:none;
    border-radius:10px;
    background:#6C63FF;
    color:#fff;
    font-size:16px;
    cursor:pointer;
    transition:.3s;
}

button:hover{
    background:#4F46E5;
}

.divider{
    text-align:center;
    margin:20px 0;
    color:#999;
}

.social{
    display:flex;
    gap:10px;
}

.social button{
    background:#f5f5f5;
    color:#333;
    border:1px solid #ddd;
}

.signup{
    text-align:center;
    margin-top:20px;
    font-size:14px;
}

.signup a{
    color:#6C63FF;
    text-decoration:none;
    font-weight:bold;
}
</style>
</head>

<body>

<div class="container">

<h2>Welcome Back</h2>

<form>

<div class="input-box">
<label>Email</label>
<input type="email" placeholder="Enter your email" required>
</div>

<div class="input-box">
<label>Password</label>
<input type="password" placeholder="Enter your password" required>
</div>

<div class="options">
<label>
<input type="checkbox">
Remember me
</label>

<a href="#">Forgot Password?</a>
</div>

<button type="submit">Sign In</button>

<div class="divider">OR</div>

<div class="social">
<button type="button">Google</button>
<button type="button">Apple</button>
</div>

<div class="signup">
Don't have an account?
<a href="#">Sign Up</a>
</div>

</form>

</div>

</body>
</html>
