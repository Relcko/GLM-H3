import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import {
    EnvelopeIcon,
    PhoneIcon,
    MapPinIcon,
    ClockIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';

const contactInfo = [
    {
        icon: EnvelopeIcon,
        title: 'Email Us',
        description: 'Our team will respond within 24 hours',
        value: 'support@relcko.com',
    },
    {
        icon: PhoneIcon,
        title: 'Call Us',
        description: 'Mon-Fri from 9am to 6pm PST',
        value: '+1 (332) 249-7289',
    },
    {
        icon: MapPinIcon,
        title: 'Visit Us',
        description: 'Come say hello at our office',
        value: '30 N Gould St Ste R, Sheridan, WY, 82801, USA.',
    },
];

const socialLinks = [
    { name: 'Twitter', href: 'https://x.com/relcko' },
    { name: 'Discord', href: 'https://discord.gg/K8ShuYfF' },
    { name: 'Telegram', href: 'https://t.me/relckoofficial' },
    { name: 'LinkedIn', href: 'https://www.linkedin.com/in/relckocoin' },
];

export default function Contact() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        alert('Thank you for your message! We will get back to you soon.');
        reset();
    };

    return (
        <MainLayout>
            <Head title="Contact Us" />

            {/* Hero */}
            <section className="relative py-24 lg:py-32 overflow-hidden">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                            Get in Touch
                        </p>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                            Contact us
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400">
                            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Content */}
            <section className="py-20 bg-gray-50 dark:bg-white/[0.02]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Contact Info */}
                        <div className="space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Let's talk</h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Our team is here to help you with any questions about investing in tokenized real estate.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {contactInfo.map((info, index) => (
                                    <div key={index} className="bg-white dark:bg-white/[0.03] rounded-xl p-5 border border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10 transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                                                <info.icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{info.title}</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">{info.description}</p>
                                                <p className="text-gray-700 dark:text-gray-300">{info.value}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Business Hours */}
                            <div className="bg-white dark:bg-white/[0.03] rounded-xl p-5 border border-gray-200 dark:border-white/5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                        <ClockIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Business Hours</h3>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Monday - Friday</span>
                                        <span className="text-gray-900 dark:text-white">9:00 AM - 6:00 PM</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Saturday</span>
                                        <span className="text-gray-900 dark:text-white">10:00 AM - 4:00 PM</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">Sunday</span>
                                        <span className="text-gray-500 dark:text-gray-500">Closed</span>
                                    </div>
                                </div>
                            </div>

                            {/* Social Links */}
                            <div className="bg-white dark:bg-white/[0.03] rounded-xl p-5 border border-gray-200 dark:border-white/5">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Follow Us</h3>
                                <div className="flex flex-wrap gap-2">
                                    {socialLinks.map((link) => (
                                        <a
                                            key={link.name}
                                            href={link.href}
                                            className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                                        >
                                            {link.name}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="lg:col-span-2">
                            <form onSubmit={handleSubmit} className="bg-white dark:bg-white/[0.03] rounded-2xl p-8 border border-gray-200 dark:border-white/5 shadow-xl">
                                <div className="mb-8">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Send us a message</h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Fill out the form below and we'll get back to you shortly</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Your Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className="w-full rounded-xl py-3 px-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-900/50 dark:focus:border-white/30 transition-all"
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            className="w-full rounded-xl py-3 px-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-900/50 dark:focus:border-white/30 transition-all"
                                            placeholder="john@example.com"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Subject *
                                        </label>
                                        <input
                                            type="text"
                                            value={data.subject}
                                            onChange={(e) => setData('subject', e.target.value)}
                                            className="w-full rounded-xl py-3 px-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-900/50 dark:focus:border-white/30 transition-all"
                                            placeholder="How can we help you?"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Message *
                                        </label>
                                        <textarea
                                            rows={6}
                                            value={data.message}
                                            onChange={(e) => setData('message', e.target.value)}
                                            className="w-full rounded-xl py-3 px-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-gray-900/20 dark:focus:ring-white/20 focus:border-gray-900/50 dark:focus:border-white/30 transition-all resize-none"
                                            placeholder="Tell us more about your inquiry..."
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="mt-8 w-full py-4 px-6 rounded-xl bg-gray-900 text-white font-semibold text-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-all disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Send Message</span>
                                            <ArrowRightIcon className="h-5 w-5" />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* Map Section Placeholder */}
            <section className="py-24 lg:py-32">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Find us on the map
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Visit our office in San Francisco
                    </p>
                    <div className="aspect-[16/9] max-w-4xl mx-auto bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/5 flex items-center justify-center">
                        <div className="text-center">
                            <MapPinIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400">Map integration coming soon</p>
                        </div>
                    </div>
                </div>
            </section>
        </MainLayout>
    );
}
