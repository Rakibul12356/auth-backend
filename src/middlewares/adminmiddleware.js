module.exports=(req,res,next)=>{
    if (req.user && req.user.role === 'admin') {
        next(); 
    } else {
       
        return res.status(403).json({ 
            error: "Access Denied: You do not have admin privileges!" 
        });
    }
}