import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
    return (
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <Link to="/" className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-blue-600">ScoutAI</span>
                    </Link>
                    
                    <Link
                        to="/upload"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                        Upload new clip
                    </Link>
                </div>
            </div>
        </header>
    );
};

export default Header;