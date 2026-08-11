import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import boatImage from '../assets/boat.jpg';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi'; // 🔥 Ensure icons are imported

const ForgotPassword = ({ onBack }) => {
    // ─── STATES ───
    const [step, setStep] = useState(1); // 1: Email, 2: OTP & New PW
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // 🔥 Missing state added
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(0);

    // ─── TIMER LOGIC ───
    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [timer]);

    // ─── USER FRIENDLY NOTIFICATION (No "Error" text) ───
    const notifyUser = (msg) => {
        Swal.fire({
            title: 'Note',
            text: msg,
            icon: 'info',
            confirmButtonColor: '#124191',
            confirmButtonText: 'Understood'
        });
    };

    // ─── REQUEST OTP ───
    const handleRequestOTP = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/data/forgot-password/request`, { email });
            Swal.fire({
                title: 'Check your Inbox',
                text: 'Verification code has been sent to your email.',
                icon: 'success',
                confirmButtonColor: '#124191'
            });
            setStep(2);
            setTimer(60);
        } catch (err) {
            notifyUser(err.response?.data?.error || 'Unable to send code. Please verify your email ID.');
        } finally { setLoading(false); }
    };

    // ─── RESET PASSWORD ───
    const handleReset = async (e) => {
        e.preventDefault();
        if (newPassword.length < 8) return notifyUser('Password must be at least 8 characters long for security.');
        
        setLoading(true);
        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/data/forgot-password/reset`, { email, otp, newPassword });
            Swal.fire({
                title: 'Update Successful',
                text: 'Your password is now updated. You can login now.',
                icon: 'success',
                confirmButtonColor: '#124191'
            });
            onBack();
        } catch (err) {
            notifyUser(err.response?.data?.error || 'Invalid code entered. Please check and try again.');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-end font-['Calibri',_sans-serif] overflow-hidden"
            style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.1), rgba(0,0,0,0.5)), url(${boatImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
            
            <div className="w-full sm:w-[85%] md:w-[45%] h-screen bg-white/95 backdrop-blur-md shadow-2xl flex flex-col justify-center px-12 relative border-l border-white/20">
                
                {/* BACK BUTTON */}
                <button onClick={onBack} className="absolute top-8 left-8 text-slate-900 font-black text-lg hover:text-blue-700 transition-all flex items-center gap-2 group">
                    <span className="text-2xl group-hover:-translate-x-1 transition-transform">&larr;</span> Back to Login
                </button>

                <div className="max-w-md w-full mx-auto">
                    <h1 className="text-3xl font-black text-slate-600 mb-3 uppercase">Reset Password</h1>
                    <p className="text-slate-600 text-lg font-bold mb-10 leading-snug">
                        {step === 1 ? "Enter your work email to receive a verification OTP." : "Enter the 6-digit OTP and your new secure password."}
                    </p>

                    {step === 1 ? (
                        <form onSubmit={handleRequestOTP} className="space-y-6">
                            <div>
                                <label className="text-[15px] font-black text-slate-900 uppercase ml-1 block mb-2 tracking-wide">Work Email Address</label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} 
                                    className="w-full p-4 rounded-xl border-2 border-slate-400 bg-white text-slate-900 text-lg font-bold outline-none focus:border-blue-600 transition-all" 
                                    placeholder="name@nokia.com" />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 disabled:opacity-50">
                                {loading ? "Processing..." : "Get Reset OTP →"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-6">
                            {/* OTP FIELD */}
                            <div>
                                <label className="text-[15px] font-black text-slate-900 uppercase ml-1 block mb-2 tracking-wide">Enter 6-Digit OTP</label>
                                <input type="text" maxLength="6" required value={otp} onChange={e => setOtp(e.target.value)} 
                                    className="w-full p-4 rounded-xl border-2 border-slate-400 bg-white text-slate-900 text-2xl text-center tracking-[12px] font-black outline-none focus:border-blue-600 transition-all" 
                                    placeholder="000000" />
                                
                                <div className="mt-3 text-right">
                                    {timer > 0 ? (
                                        <span className="text-sm text-slate-600 font-black italic">Resend available in {timer}s</span>
                                    ) : (
                                        <button type="button" onClick={handleRequestOTP} className="text-sm text-blue-700 font-black uppercase hover:underline">
                                            Resend New OTP
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            {/* NEW PASSWORD FIELD */}
                            <div>
                                <label className="text-[15px] font-black text-slate-900 uppercase ml-1 block mb-2 tracking-wide">New Secure Password</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        required 
                                        value={newPassword} 
                                        onChange={e => setNewPassword(e.target.value)} 
                                        className="w-full p-4 pr-14 rounded-xl border-2 border-slate-400 bg-white text-slate-900 text-lg font-bold outline-none focus:border-blue-600 transition-all" 
                                        placeholder="••••••••" 
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors bg-transparent border-none outline-none flex items-center justify-center"
                                    >
                                        {showPassword ? <HiOutlineEyeOff size={24} strokeWidth={2.5} /> : <HiOutlineEye size={24} strokeWidth={2.5} />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-800 mt-2 ml-1 font-black italic underline bg-amber-50 w-fit px-2 py-1 rounded">Min 8 characters required.</p>
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 disabled:opacity-50">
                                {loading ? "Updating..." : "Update & Login"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;